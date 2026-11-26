"""SQS → private S3 original → immutable preview → authenticated callback → PDF extraction."""
import base64
import hashlib
import json
import os
import re
import tempfile
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from urllib import error, parse, request

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from renderer import InvalidDocument, MAX_FILE, render

UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
JOB_KEY = re.compile(rf"({UUID})/({UUID})/source\.(docx|pptx|hwpx|hwp)")


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class Callback:
    def __init__(self, url, token):
        parsed = parse.urlsplit(url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or
                parsed.query or parsed.fragment or parsed.path != "/internal/v1/pdf-extractions/previews"):
            raise ValueError("INVALID_PREVIEW_CALLBACK_URL")
        if len(token) < 32 or any(char.isspace() for char in token):
            raise ValueError("INVALID_PREVIEW_CALLBACK_TOKEN")
        self.url, self.token = url, token
        self.opener = request.build_opener(NoRedirect())

    def __call__(self, payload):
        req = request.Request(self.url, json.dumps(payload).encode(), headers={
            "Authorization": "Bearer " + self.token, "Content-Type": "application/json"})
        try:
            with self.opener.open(req, timeout=7) as response:
                if response.status != 204:
                    raise RuntimeError("PREVIEW_CALLBACK_FAILED")
        except error.HTTPError as exc:
            if exc.code == 404 and json.loads(exc.read(2048)).get("code") == "PDF_EXTRACTION_NOT_FOUND":
                return False
            raise RuntimeError("PREVIEW_CALLBACK_FAILED") from None
        return True


def validated_prefix(variable):
    value = os.environ[variable]
    if not value or value.startswith("/") or not value.endswith("/"):
        raise ValueError("INVALID_STORAGE_PREFIX")
    return value


@dataclass(frozen=True)
class Routes:
    bucket: str
    original: str
    preview: str
    extraction: str

    def job(self, record):
        if (record.get("eventSource") != "aws:s3" or not record.get("eventName", "").startswith("ObjectCreated:")
                or record["s3"]["bucket"]["name"] != self.bucket):
            raise ValueError("UNEXPECTED_EVENT")
        obj = record["s3"]["object"]
        key = parse.unquote_plus(obj["key"])
        if not key.startswith(self.original):
            raise ValueError("UNEXPECTED_ORIGINAL_KEY")
        match = JOB_KEY.fullmatch(key[len(self.original):])
        if not match:
            raise ValueError("UNEXPECTED_ORIGINAL_KEY")
        review, job_id, extension = match.groups()
        scope = f"{review}/{job_id}/"
        return Job(job_id, extension, key, obj.get("versionId"), self.preview + scope + "preview.pdf",
                   self.extraction + scope + "source.pdf")


@dataclass(frozen=True)
class Job:
    job_id: str
    extension: str
    original: str
    version: str | None
    preview: str
    extraction: str

    def payload(self, original_sha, status, preview_sha=None):
        return {"jobId": self.job_id, "originalFileKey": self.original, "originalSha256": original_sha,
                "status": status, "previewSha256": preview_sha}


def stored_checksum(response):
    digest = base64.b64decode(response["ChecksumSHA256"], validate=True)
    if len(digest) != 32:
        raise ValueError("INVALID_OBJECT_CHECKSUM")
    return digest.hex()


class Storage:
    def __init__(self, client, bucket):
        self.client, self.bucket = client, bucket

    def get(self, key, version=None):
        params = {"Bucket": self.bucket, "Key": key, "ChecksumMode": "ENABLED"}
        if version:
            params["VersionId"] = version
        return self.client.get_object(**params)

    def has_preview(self, key):
        listing = self.client.list_objects_v2(Bucket=self.bucket, Prefix=key, MaxKeys=1)
        return any(item["Key"] == key for item in listing.get("Contents", []))

    def put_once(self, key, path, digest):
        checksum = base64.b64encode(bytes.fromhex(digest)).decode()
        try:
            with path.open("rb") as pdf:
                self.client.put_object(Bucket=self.bucket, Key=key, Body=pdf, ContentType="application/pdf",
                                       CacheControl="no-store", ChecksumSHA256=checksum, IfNoneMatch="*")
        except ClientError as exc:
            if exc.response["ResponseMetadata"]["HTTPStatusCode"] == 412:
                return False
            raise
        return True

    def publish(self, key, path, digest):
        if self.put_once(key, path, digest):
            return
        current = self.client.head_object(Bucket=self.bucket, Key=key, ChecksumMode="ENABLED")
        if stored_checksum(current) != digest:
            raise RuntimeError("EXTRACTION_INPUT_CONFLICT")


def download(response, path):
    expected = response["ContentLength"]
    if not 1 <= expected <= MAX_FILE:
        raise InvalidDocument("INVALID_FILE_SIZE")
    digest, size = hashlib.sha256(), 0
    with path.open("wb") as target:
        for chunk in response["Body"].iter_chunks(128 * 1024):
            size += len(chunk)
            if size > MAX_FILE:
                raise InvalidDocument("INVALID_FILE_SIZE")
            digest.update(chunk)
            target.write(chunk)
    if size != expected or digest.hexdigest() != stored_checksum(response):
        raise RuntimeError("S3_CONTENT_MISMATCH")
    return digest.hexdigest()


def staged_preview(job, directory, storage, convert, original, timeout_seconds):
    local = directory / "staged.pdf"
    if not storage.has_preview(job.preview):
        candidate = convert(original, timeout_seconds)
        with candidate.open("rb") as pdf:
            digest = hashlib.file_digest(pdf, "sha256").hexdigest()
        if storage.put_once(job.preview, candidate, digest):
            return candidate, digest
    response = storage.get(job.preview)
    with closing(response["Body"]):
        digest = download(response, local)
    return local, digest


def process(job, storage, notify, remaining_ms, convert=render):
    with tempfile.TemporaryDirectory(prefix="doc-preview-") as temp:
        directory = Path(temp)
        original = directory / ("source." + job.extension)
        response = storage.get(job.original, job.version)
        with closing(response["Body"]):
            original_sha = stored_checksum(response)
            try:
                download(response, original)
                budget = min(70, (remaining_ms() - 20_000) // 1000)
                if budget < 1:
                    raise RuntimeError("INSUFFICIENT_INVOCATION_TIME")
                pdf, digest = staged_preview(job, directory, storage, convert, original, budget)
            except InvalidDocument:
                notify(job.payload(original_sha, "FAILED"))
                return
        if notify(job.payload(original_sha, "READY", digest)):
            storage.publish(job.extraction, pdf, digest)


def consume(event, routes, storage, notify, remaining_ms):
    failures = []
    for message in event["Records"]:
        try:
            if message.get("eventSource") != "aws:sqs":
                raise ValueError("UNEXPECTED_MESSAGE")
            body = json.loads(message["body"])
            if body.get("Event") == "s3:TestEvent":
                continue
            for record in body["Records"]:
                process(routes.job(record), storage, notify, remaining_ms)
        except Exception as exc:
            print(json.dumps({"event": "DOCUMENT_PREVIEW_RETRY", "errorType": type(exc).__name__}))
            failures.append({"itemIdentifier": message["messageId"]})
    return {"batchItemFailures": failures}


def services():
    routes = Routes(os.environ["PDF_BUCKET"], validated_prefix("DOCUMENT_ORIGINAL_PREFIX"),
                    validated_prefix("DOCUMENT_PREVIEW_PREFIX"), validated_prefix("PDF_INPUT_PREFIX"))
    if len({routes.original, routes.preview, routes.extraction}) != 3:
        raise ValueError("OVERLAPPING_STORAGE_PREFIX")
    client = boto3.client("s3", config=Config(connect_timeout=3, read_timeout=15,
                                             retries={"total_max_attempts": 2, "mode": "standard"}))
    notify = Callback(os.environ["DOCUMENT_PREVIEW_CALLBACK_URL"], os.environ["DOCUMENT_PREVIEW_CALLBACK_TOKEN"])
    return routes, Storage(client, routes.bucket), notify


def handler(event, context):
    return consume(event, *services(), context.get_remaining_time_in_millis)


def direct_handler(event, context):
    """Lambda retries the entire asynchronous S3 invocation when processing raises."""
    if event.get("Event") == "s3:TestEvent":
        return
    if not event.get("Records"):
        raise ValueError("MISSING_S3_RECORDS")
    routes, storage, notify = services()
    for record in event["Records"]:
        process(routes.job(record), storage, notify, context.get_remaining_time_in_millis)
