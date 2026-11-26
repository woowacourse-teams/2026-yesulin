import base64
import hashlib
import json
import unittest
import zlib
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch
from zipfile import ZIP_BZIP2, ZIP_DEFLATED, ZipFile

from botocore.response import StreamingBody

from renderer import InvalidDocument, bounded_stream_size, validate_input
from worker import Routes, consume, process


ROUTES = Routes("private-files", "env/originals/", "env/previews/", "env/inputs/")
REVIEW = "00000000-0000-4000-a000-000000000001"
JOB_ID = "00000000-0000-4000-a000-000000000002"
ORIGINAL = ROUTES.original + f"{REVIEW}/{JOB_ID}/source.docx"
RECORD = {"eventSource": "aws:s3", "eventName": "ObjectCreated:Put",
          "s3": {"bucket": {"name": ROUTES.bucket}, "object": {"key": ORIGINAL, "versionId": "v1"}}}
JOB = ROUTES.job(RECORD)


class Store:
    def __init__(self):
        self.objects = {ORIGINAL: b"original bytes"}
        self.published = []

    def get(self, key, version=None):
        if key == ORIGINAL:
            assert version == "v1"
        body = self.objects[key]
        return {"ContentLength": len(body), "ChecksumSHA256": base64.b64encode(hashlib.sha256(body).digest()),
                "Body": StreamingBody(BytesIO(body), len(body))}

    def has_preview(self, key):
        return key in self.objects

    def put_once(self, key, path, digest):
        if key in self.objects:
            return False
        self.objects[key] = path.read_bytes()
        return True

    def publish(self, key, path, digest):
        self.published.append(key)
        self.put_once(key, path, digest)


def convert(path, timeout):
    out = path.with_suffix(".pdf")
    out.write_bytes(b"%PDF-1.7 mock")
    return out


class WorkerChecks(unittest.TestCase):
    def test_original_immutable_and_retry_reuses_staged_pdf_before_publication(self):
        store, render = Store(), Mock(side_effect=convert)
        notify = Mock(side_effect=[RuntimeError("interrupted"), True, True])
        with self.assertRaises(RuntimeError):
            process(JOB, store, notify, lambda: 120000, render)
        self.assertNotIn(JOB.extraction, store.objects)
        for _ in range(2):
            process(JOB, store, notify, lambda: 120000, render)
        self.assertEqual(1, render.call_count)
        self.assertEqual(store.objects[JOB.preview], store.objects[JOB.extraction])
        self.assertEqual(store.objects[ORIGINAL], b"original bytes")
        self.assertEqual(notify.call_args.args[0], JOB.payload(
            hashlib.sha256(b"original bytes").hexdigest(), "READY", hashlib.sha256(b"%PDF-1.7 mock").hexdigest()))

    def test_concurrent_stage_writer_wins_and_exact_winning_bytes_are_published(self):
        class RacingStore(Store):
            def put_once(self, key, path, digest):
                if key == JOB.preview:
                    self.objects[key] = b"first rendering"
                    return False
                return super().put_once(key, path, digest)
        store, notify = RacingStore(), Mock(return_value=True)
        process(JOB, store, notify, lambda: 120000, convert)
        self.assertEqual(b"first rendering", store.objects[JOB.extraction])
        self.assertEqual(hashlib.sha256(b"first rendering").hexdigest(), notify.call_args.args[0]["previewSha256"])

    def test_compressed_hwp_stream_is_limited_during_inflation(self):
        compressor = zlib.compressobj(wbits=-zlib.MAX_WBITS)
        data = compressor.compress(b"x" * 1024) + compressor.flush()
        self.assertEqual(1024, bounded_stream_size(data, 1024))
        with self.assertRaises(InvalidDocument):
            bounded_stream_size(data, 1023)

    def test_unsupported_codec_and_unreadable_metadata_finish_as_failed(self):
        for compression, error in ((ZIP_BZIP2, None), (ZIP_DEFLATED, zlib.error("damaged content"))):
            archive = BytesIO()
            with ZipFile(archive, "w", compression=compression) as package:
                package.writestr("[Content_Types].xml", "<Types/>")
            store, notify = Store(), Mock()
            store.objects[ORIGINAL] = archive.getvalue()
            with patch.object(ZipFile, "read", side_effect=error) as read:
                process(JOB, store, notify, lambda: 120000)
            self.assertEqual(int(error is not None), read.call_count)
            self.assertEqual("FAILED", notify.call_args.args[0]["status"])
            self.assertEqual([ORIGINAL], list(store.objects))

    def test_unsupported_package_metadata_is_a_document_failure(self):
        store, notify = Store(), Mock()
        with patch("renderer.zipfile.ZipFile", side_effect=NotImplementedError("unreadable ZIP version")):
            process(JOB, store, notify, lambda: 120000)
        self.assertEqual("FAILED", notify.call_args.args[0]["status"])
        self.assertFalse(store.published)

    def test_deleted_job_does_not_enter_extraction(self):
        store = Store()
        process(JOB, store, lambda payload: False, lambda: 120000, convert)
        self.assertFalse(store.published)

    def test_invalid_document_reports_failure_without_extractor(self):
        store, notify = Store(), Mock()
        process(JOB, store, notify, lambda: 120000, Mock(side_effect=InvalidDocument()))
        self.assertEqual("FAILED", notify.call_args.args[0]["status"])
        self.assertEqual([ORIGINAL], list(store.objects))

    def test_only_originals_route_and_invalid_sqs_messages_retry_individually(self):
        for key in (JOB.extraction, JOB.preview, ORIGINAL.replace("docx", "pdf"), ORIGINAL.replace("env/", "other/")):
            with self.assertRaises(ValueError):
                ROUTES.job({**RECORD, "s3": {**RECORD["s3"], "object": {"key": key}}})
        messages = [
            {"eventSource": "aws:sqs", "messageId": "1", "body": json.dumps({"Event": "s3:TestEvent"})},
            {"eventSource": "aws:sqs", "messageId": "2", "body": "{}"}]
        result = consume({"Records": messages}, ROUTES, Store(), Mock(), lambda: 120000)
        self.assertEqual({"batchItemFailures": [{"itemIdentifier": "2"}]}, result)

    def test_office_allows_web_hyperlinks_and_rejects_external_images_or_spoofed_zip(self):
        with TemporaryDirectory() as dirname:
            path = Path(dirname) / "sample.docx"
            for resource in ("hyperlink", "image", "wrong-format"):
                with ZipFile(path, "w") as z:
                    z.writestr("word/document.xml", "<Document/>")
                    z.writestr("[Content_Types].xml", '<Types><Override PartName="/word/document.xml" '
                               'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
                    z.writestr("word/_rels/document.xml.rels", '<Relationships><Relationship TargetMode="External"'
                               f' Target="https://example.org/work" Type="relationships/{resource}"/></Relationships>')
                if resource == "hyperlink":
                    validate_input(path)
                    continue
                with self.assertRaises(InvalidDocument):
                    validate_input(path)
            path.write_bytes(b"not an office file")
            with self.assertRaises(InvalidDocument):
                validate_input(path)


if __name__ == "__main__":
    unittest.main()
