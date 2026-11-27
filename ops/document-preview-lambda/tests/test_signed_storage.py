import base64
import hashlib
import json
import unittest
from dataclasses import replace
from io import BytesIO
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from urllib.parse import urlsplit

from renderer import InvalidDocument
from signed_storage import JobStorage, NoRedirect, Transfers
from test_worker import JOB, JOB_ID, ORIGINAL, RECORD, ROUTES, convert
from worker import Callback, direct_handler, process, services


CALLBACK = 'https://api.example.test/internal/v1/pdf-extractions/previews'
CALLBACK_TOKEN = 'callback-test-value-' * 2
TRANSFER_TOKEN = 'transfer-test-value-' * 2
SOURCE = b'original bytes'
ETAG = 'b' * 32
REGION = 'ap-northeast-2'
TARGET = f'https://{ROUTES.bucket}.s3.{REGION}.amazonaws.com/'
SIGNATURE = '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Signature=' + 'a' * 64
EVENT = {**RECORD, 's3': {**RECORD['s3'], 'object': {'key': ORIGINAL, 'size': len(SOURCE), 'eTag': ETAG}}}
ENV = {'AWS_REGION': REGION, 'PDF_BUCKET': ROUTES.bucket, 'DOCUMENT_ORIGINAL_PREFIX': ROUTES.original,
       'DOCUMENT_PREVIEW_PREFIX': ROUTES.preview, 'PDF_INPUT_PREFIX': ROUTES.extraction,
       'DOCUMENT_PREVIEW_CALLBACK_URL': CALLBACK, 'DOCUMENT_PREVIEW_CALLBACK_TOKEN': CALLBACK_TOKEN}


class Response(BytesIO):
    def __init__(self, data, status=200):
        super().__init__(data)
        self.status, self.headers = status, {'Content-Length': str(len(data))}


class Exchange:
    def __init__(self):
        self.objects = {ORIGINAL: SOURCE}
        self.history = []
        self.ready = False
        self.race = False
        self.grant_failure = None
        self.modify_grant = lambda grant: grant

    def open(self, req, timeout):
        if req.full_url == CALLBACK:
            assert req.get_header('Authorization') == 'Bearer ' + CALLBACK_TOKEN
            payload = json.loads(req.data)
            self.history.append(payload['status'])
            self.ready = payload['status'] == 'READY'
            return Response(b'', 204)
        if req.full_url == CALLBACK.replace('/previews', '/preview-transfers'):
            assert req.get_header('Authorization') == 'Bearer ' + TRANSFER_TOKEN
            return self.issue(req)
        assert req.get_header('Authorization') is None
        key = urlsplit(req.full_url).path[1:]
        self.history.append((req.get_method(), key))
        if req.get_method() == 'GET':
            assert req.get_header('If-match') == '"' + ETAG + '"'
            return Response(self.objects[key])
        body = req.data.read()
        assert req.get_header('Content-length') == str(len(body))
        assert req.get_header('If-none-match') == '*'
        assert req.get_header('X-amz-checksum-sha256') == base64.b64encode(hashlib.sha256(body).digest()).decode()
        if self.race and key == JOB.preview:
            self.objects[key] = b'%PDF concurrent winner'
        if key in self.objects:
            raise HTTPError(req.full_url, 412, 'exists', {}, BytesIO())
        self.objects[key] = body
        return Response(b'')

    def issue(self, req):
        claim = json.loads(req.data)
        assert (claim['jobId'], claim['originalFileKey'], claim['sourceETag']) == (JOB_ID, ORIGINAL, ETAG)
        operation = claim['operation']
        self.history.append(operation)
        if self.grant_failure:
            status, data = self.grant_failure
            raise HTTPError(req.full_url, status, 'test', {}, BytesIO(data))
        key = {'SOURCE': ORIGINAL, 'PREVIEW_READ': JOB.preview, 'PREVIEW_RECOVER': JOB.preview, 'PREVIEW_WRITE': JOB.preview,
               'INPUT_WRITE': JOB.extraction, 'INPUT_VERIFY': JOB.extraction}[operation]
        if operation == 'SOURCE':
            assert claim['size'] == len(SOURCE)
        if operation.startswith('INPUT_'):
            assert self.ready
        if operation == 'PREVIEW_READ' and not self.ready:
            return Response(b'', 204)
        if operation == 'INPUT_VERIFY':
            assert hashlib.sha256(self.objects[key]).hexdigest() == claim['sha256']
            assert len(self.objects[key]) == claim['size']
            return Response(b'', 204)
        if operation.endswith('_WRITE'):
            checksum = base64.b64encode(bytes.fromhex(claim['sha256'])).decode()
            grant = {'method': 'PUT', 'size': claim['size'], 'sha256': claim['sha256'], 'headers': {
                'Content-Type': 'application/pdf', 'If-None-Match': '*', 'x-amz-checksum-sha256': checksum,
                'Content-Length': str(claim['size'])}}
            return self.grant_response(grant, key)
        data = self.objects[key]
        grant = {'method': 'GET', 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                 'headers': {'If-Match': '"' + ETAG + '"'}}
        return self.grant_response(grant, key)

    def grant_response(self, grant, key):
        grant['url'] = TARGET + key + SIGNATURE
        return Response(json.dumps(self.modify_grant(grant)).encode())


class TransferChecks(unittest.TestCase):
    def setUp(self):
        self.callback = Callback(CALLBACK, CALLBACK_TOKEN)
        self.storage = Transfers(self.callback, TRANSFER_TOKEN, ROUTES.bucket, REGION)
        self.exchange = Exchange()
        self.callback.opener = self.storage.opener = self.exchange
        self.convert = Mock(side_effect=convert)

    def invoke(self, event=EVENT):
        def run(job, storage, callback, remaining):
            return process(job, storage, callback, remaining, self.convert)
        context = Mock()
        context.get_remaining_time_in_millis.return_value = 120000
        with patch('worker.services', return_value=(ROUTES, self.storage, self.callback)), patch('worker.process', run):
            direct_handler({'Records': [event]}, context)

    def test_real_entry_point_replay_confirms_identical_input_without_rendering_again(self):
        self.invoke()
        self.assertEqual(['SOURCE', ('GET', ORIGINAL), 'PREVIEW_READ', 'PREVIEW_WRITE', ('PUT', JOB.preview),
                          'READY', 'INPUT_WRITE', ('PUT', JOB.extraction)], self.exchange.history)
        self.assertEqual(SOURCE, self.exchange.objects[ORIGINAL])
        self.invoke()
        self.convert.assert_called_once()
        self.assertEqual('INPUT_VERIFY', self.exchange.history[-1])
        self.assertEqual(self.exchange.objects[JOB.preview], self.exchange.objects[JOB.extraction])

    def test_stage_loser_reads_and_publishes_winner(self):
        self.exchange.race = True
        self.invoke()
        self.assertEqual(b'%PDF concurrent winner', self.exchange.objects[JOB.extraction])
        self.assertEqual(1, self.exchange.history.count('PREVIEW_READ'))
        self.assertEqual(1, self.exchange.history.count('PREVIEW_RECOVER'))

    def test_only_deleted_job_is_a_success(self):
        settings = [(404, b'{"code":"PDF_EXTRACTION_NOT_FOUND"}'), (404, b'{}'), (404, b'not json'),
                    (401, b'{}'), (503, b'{}')]
        for pair in settings:
            with self.subTest(status=pair):
                self.exchange.grant_failure = pair
                if pair == settings[0]:
                    self.invoke()
                    continue
                with self.assertRaisesRegex(RuntimeError, 'PREVIEW_TRANSFER_HTTP_'):
                    self.invoke()
        self.convert.assert_not_called()

    def test_failed_conversion_preserves_original_and_reports_failed(self):
        self.convert.side_effect = InvalidDocument()
        self.invoke()
        self.assertEqual('FAILED', self.exchange.history[-1])
        self.assertEqual({ORIGINAL: SOURCE}, self.exchange.objects)

    def test_wrong_digest_size_etag_and_untrusted_headers_do_not_report_a_document_failure(self):
        changes = [{'sha256': 'a' * 64}, {'size': len(SOURCE) + 1}, {'headers': {'If-Match': '"' + 'c' * 32 + '"'}},
                   {'headers': {'Authorization': 'unexpected'}}, {'headers': {'If-Match': 'bad'}}, {'method': 'POST'}]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(RuntimeError):
                self.exchange.modify_grant = lambda grant: {**grant, **change}
                self.invoke()
        self.assertNotIn('FAILED', self.exchange.history)
        self.convert.assert_not_called()

    def test_only_expected_regional_s3_object_target_is_accepted(self):
        replacements = [TARGET.replace('https:', 'http:'), TARGET.replace('s3.', 'alt.'),
                        TARGET.replace(REGION, 'us-east-1'), TARGET.replace('https://', 'https://user@'),
                        TARGET.replace('.com/', '.com:444/'), TARGET + 'other/']
        for wrong in replacements:
            with self.subTest(wrong=wrong), self.assertRaisesRegex(RuntimeError, 'INVALID_TRANSFER_TARGET'):
                self.storage.check_target(wrong + ORIGINAL + SIGNATURE, ORIGINAL)
        self.storage.check_target(f'https://s3.{REGION}.amazonaws.com/{ROUTES.bucket}/{ORIGINAL}{SIGNATURE}', ORIGINAL)
        self.assertIsNone(NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_presigned_url_lifetime_is_at_most_five_minutes(self):
        for expires in ['0', '301', '9999', '', '-1', '300&X-Amz-Expires=2']:
            with self.subTest(expires=expires), self.assertRaisesRegex(RuntimeError, 'INVALID_TRANSFER_SIGNATURE'):
                self.storage.check_target(TARGET + ORIGINAL + SIGNATURE.replace('Expires=300', 'Expires=' + expires), ORIGINAL)
        self.storage.check_target(TARGET + ORIGINAL + SIGNATURE.replace('Expires=300', 'Expires=1'), ORIGINAL)

    def test_missing_first_callback_recovers_immutable_winner_while_still_pending(self):
        self.exchange.objects[JOB.preview] = b'%PDF already staged'
        self.invoke()
        self.assertEqual(b'%PDF already staged', self.exchange.objects[JOB.extraction])
        self.assertIn('PREVIEW_RECOVER', self.exchange.history)

    def test_explicit_presigned_mode_fails_closed_and_never_calls_sdk(self):
        with patch('worker.boto3.client') as aws:
            with patch.dict('os.environ', {**ENV, 'DOCUMENT_PREVIEW_STORAGE_MODE': 'presigned',
                                           'DOCUMENT_PREVIEW_TRANSFER_TOKEN': TRANSFER_TOKEN}, clear=True):
                self.assertIsInstance(services()[1], Transfers)
            for mode, token in [('presigned', ''), ('direct', TRANSFER_TOKEN), ('invalid', ''), ('presigned', CALLBACK_TOKEN)]:
                with self.subTest(mode=mode), patch.dict('os.environ', {**ENV, 'DOCUMENT_PREVIEW_STORAGE_MODE': mode,
                            'DOCUMENT_PREVIEW_TRANSFER_TOKEN': token}, clear=True), self.assertRaises(ValueError):
                    services()
            aws.assert_not_called()
            with patch.dict('os.environ', ENV, clear=True):
                services()
            aws.assert_called_once()

    def test_bad_event_metadata_rejected_before_grant(self):
        for job in [replace(JOB, etag=ETAG), replace(JOB, size=1), replace(JOB, size=-1, etag=ETAG)]:
            with self.subTest(job=job), self.assertRaisesRegex(ValueError, 'INVALID_SOURCE_EVENT_METADATA'):
                JobStorage(self.storage, job)
        self.assertEqual([], self.exchange.history)
