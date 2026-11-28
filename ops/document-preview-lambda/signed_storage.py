"""Job-scoped, conditional S3 transfers issued by the preview callback's application."""
import base64
import json
import re
from http.client import HTTPException
from urllib import error, parse, request

from botocore.response import StreamingBody

from renderer import MAX_FILE


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class DeletedJob(Exception):
    pass


def valid_size(value):
    return type(value) is int and 1 <= value <= MAX_FILE


def is_etag(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9A-Fa-f]{32}(?:-[1-9][0-9]*)?', value) is not None


def is_sha256(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value) is not None


def encoded_digest(digest):
    return base64.b64encode(bytes.fromhex(digest)).decode('ascii')


def deleted_response(exc):
    if exc.code != 404:
        return False
    try:
        data = json.loads(exc.read(2048))
    except (UnicodeError, ValueError):
        return False
    return isinstance(data, dict) and data.get('code') == 'PDF_EXTRACTION_NOT_FOUND'


class Transfers:
    def __init__(self, callback, token, bucket, region):
        if not token.isascii() or len(token) < 32 or any(c.isspace() for c in token) or token == callback.token:
            raise ValueError('INVALID_PREVIEW_TRANSFER_TOKEN')
        self.endpoint = parse.urljoin(callback.url, 'preview-transfers')
        self.token, self.bucket, self.region = token, bucket, region
        self.opener = request.build_opener(NoRedirect())

    def grant(self, claim, operation, **metadata):
        body = json.dumps({**claim, 'operation': operation, **metadata}).encode()
        req = request.Request(self.endpoint, body, headers={
            'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'})
        try:
            with self.opener.open(req, timeout=7) as response:
                return self.read_grant(response, operation)
        except error.HTTPError as exc:
            with exc:
                if deleted_response(exc):
                    raise DeletedJob() from None
                raise RuntimeError(f'PREVIEW_TRANSFER_HTTP_{exc.code}') from None
        except (OSError, HTTPException, ValueError):
            raise RuntimeError('PREVIEW_TRANSFER_UNAVAILABLE') from None

    @staticmethod
    def read_grant(response, operation):
        if response.status == 204 and operation in ('PREVIEW_READ', 'INPUT_VERIFY'):
            return None
        if response.status != 200 or operation == 'INPUT_VERIFY':
            raise RuntimeError('UNEXPECTED_TRANSFER_STATUS')
        body = response.read(16385)
        if len(body) > 16384:
            raise RuntimeError('INVALID_TRANSFER_RESPONSE')
        grant = json.loads(body)
        if not isinstance(grant, dict):
            raise RuntimeError('INVALID_TRANSFER_RESPONSE')
        return grant

    def check_target(self, url, key):
        if not isinstance(url, str) or not url.isascii() or any(ord(char) <= 32 or ord(char) == 127 for char in url):
            raise RuntimeError('INVALID_TRANSFER_TARGET')
        try:
            target = parse.urlsplit(url)
            host = f's3.{self.region}.amazonaws.com'
            locations = {(f'{self.bucket}.{host}', '/' + key), (host, f'/{self.bucket}/{key}')}
            if (target.scheme != 'https' or target.username is not None or target.password is not None or
                    target.fragment or target.port not in (None, 443) or
                    (target.hostname, parse.unquote(target.path)) not in locations):
                raise RuntimeError('INVALID_TRANSFER_TARGET')
            query = parse.parse_qs(target.query, max_num_fields=40)
            if (query.get('X-Amz-Algorithm') != ['AWS4-HMAC-SHA256'] or
                    not self.valid_expiration(query.get('X-Amz-Expires', [])) or
                    len(query.get('X-Amz-Signature', [])) != 1 or not is_sha256(query['X-Amz-Signature'][0])):
                raise RuntimeError('INVALID_TRANSFER_SIGNATURE')
        except ValueError:
            raise RuntimeError('INVALID_TRANSFER_TARGET') from None

    @staticmethod
    def valid_expiration(values):
        return (len(values) == 1 and re.fullmatch(r'[1-9][0-9]{0,2}', values[0]) is not None
                and int(values[0]) <= 300)


class JobStorage:
    def __init__(self, transfers, job):
        if not is_etag(job.etag) or not valid_size(job.size):
            raise ValueError('INVALID_SOURCE_EVENT_METADATA')
        self.transfers, self.job = transfers, job
        self.claim = {'jobId': job.job_id, 'originalFileKey': job.original, 'sourceETag': job.etag}
        self.staged = None

    def request(self, grant, key, method):
        if grant.get('method') != method or not valid_size(grant.get('size')) or not is_sha256(grant.get('sha256')):
            raise RuntimeError('INVALID_TRANSFER_METADATA')
        self.transfers.check_target(grant.get('url'), key)
        raw_headers = grant.get('headers')
        if not isinstance(raw_headers, dict):
            raise RuntimeError('INVALID_TRANSFER_HEADERS')
        headers = {k.lower(): v for k, v in raw_headers.items()}
        if len(headers) != len(raw_headers):
            raise RuntimeError('INVALID_TRANSFER_HEADERS')
        if method == 'GET':
            self.check_get_headers(headers, key)
        if method == 'PUT':
            self.check_put_headers(headers, grant)
        return request.Request(grant['url'], headers=headers, method=method)

    def check_get_headers(self, headers, key):
        etag = headers.get('if-match')
        if set(headers) != {'if-match'} or not isinstance(etag, str) or not re.fullmatch(r'"[\da-fA-F]{32}(?:-[1-9][0-9]*)?"', etag):
            raise RuntimeError('INVALID_TRANSFER_HEADERS')
        if key == self.job.original and etag[1:-1] != self.job.etag:
            raise RuntimeError('SOURCE_ETAG_MISMATCH')

    @staticmethod
    def check_put_headers(headers, grant):
        expected = {'if-none-match': '*', 'content-type': 'application/pdf',
                    'x-amz-checksum-sha256': encoded_digest(grant['sha256'])}
        if 'cache-control' in headers:
            expected['cache-control'] = 'no-store'
        if 'content-length' in headers:
            expected['content-length'] = str(grant['size'])
        if headers != expected:
            raise RuntimeError('INVALID_TRANSFER_HEADERS')
        headers['content-length'] = str(grant['size'])

    def has_preview(self, key):
        self.staged = self.transfers.grant(self.claim, 'PREVIEW_READ')
        return self.staged is not None

    def get(self, key, version=None):
        if key == self.job.original:
            grant = self.transfers.grant(self.claim, 'SOURCE', size=self.job.size)
            if grant.get('size') != self.job.size:
                raise RuntimeError('SOURCE_SIZE_MISMATCH')
            return self.download(grant, key)
        grant = self.staged or self.transfers.grant(self.claim, 'PREVIEW_RECOVER')
        if key != self.job.preview or grant is None:
            raise RuntimeError('MISSING_STAGED_PREVIEW')
        return self.download(grant, key)

    def download(self, grant, key):
        req = self.request(grant, key, 'GET')
        try:
            response = self.transfers.opener.open(req, timeout=15)
        except error.HTTPError as exc:
            with exc:
                raise RuntimeError(f'PREVIEW_OBJECT_GET_HTTP_{exc.code}') from None
        except (OSError, HTTPException):
            raise RuntimeError('PREVIEW_OBJECT_GET_UNAVAILABLE') from None
        if response.status != 200 or response.headers.get('Content-Length') != str(grant['size']):
            response.close()
            raise RuntimeError('PREVIEW_OBJECT_SIZE_MISMATCH')
        return {'ContentLength': grant['size'], 'ChecksumSHA256': encoded_digest(grant['sha256']),
                'Body': StreamingBody(response, grant['size'])}

    def put_once(self, key, path, digest):
        if key == self.job.preview:
            return self.upload('PREVIEW_WRITE', key, path, digest)
        raise RuntimeError('UNEXPECTED_PREVIEW_TARGET')

    def upload(self, operation, key, path, digest):
        size = path.stat().st_size
        grant = self.transfers.grant(self.claim, operation, size=size, sha256=digest)
        if grant.get('size') != size or grant.get('sha256') != digest:
            raise RuntimeError('PREVIEW_UPLOAD_MISMATCH')
        req = self.request(grant, key, 'PUT')
        try:
            with path.open('rb') as body:
                req.data = body
                req.add_header('Content-Length', str(size))
                with self.transfers.opener.open(req, timeout=20) as response:
                    if response.status != 200:
                        raise RuntimeError('PREVIEW_OBJECT_PUT_FAILED')
        except error.HTTPError as exc:
            with exc:
                if exc.code == 412:
                    return False
                raise RuntimeError(f'PREVIEW_OBJECT_PUT_HTTP_{exc.code}') from None
        except (OSError, HTTPException):
            raise RuntimeError('PREVIEW_OBJECT_PUT_UNAVAILABLE') from None
        return True

    def publish(self, key, path, digest):
        if key != self.job.extraction:
            raise RuntimeError('UNEXPECTED_EXTRACTION_TARGET')
        if not self.upload('INPUT_WRITE', key, path, digest):
            self.transfers.grant(self.claim, 'INPUT_VERIFY', size=path.stat().st_size, sha256=digest)
