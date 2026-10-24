import copy
import hashlib
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
import zlib
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from application.extraction import ExtractionError, Limits, extract_pdf
from application.jobs import Settings, process_job


def sample_pdf(text="Yesulin PDF test", image=True, pages=1, rotation=0):
    """Small valid fixture with selectable text and a colored image; no applicant data."""
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    image_number = None
    if image:
        image_number = len(objects) + 1
        pixels = bytes([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]) * 5000
        compressed = zlib.compress(pixels)
        objects.append(b"<< /Type /XObject /Subtype /Image /Width 200 /Height 100 /ColorSpace /DeviceRGB "
                       b"/BitsPerComponent 8 /Filter /FlateDecode /Length " + str(len(compressed)).encode()
                       + b" >>\nstream\n" + compressed + b"\nendstream")
    kids = []
    for _ in range(pages):
        page_number, content_number = len(objects) + 1, len(objects) + 2
        kids.append(f"{page_number} 0 R")
        resources = "/Font << /F1 3 0 R >>"
        if image:
            resources += f" /XObject << /Photo {image_number} 0 R >>"
        objects.append((f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Rotate {rotation} "
                        f"/Resources << {resources} >> /Contents {content_number} 0 R >>").encode())
        commands = f"BT /F1 14 Tf 40 780 Td ({text}) Tj ET\n" if text else ""
        if image:
            commands += "q 200 0 0 100 40 500 cm /Photo Do Q\n"
        encoded = commands.encode("ascii")
        objects.append(f"<< /Length {len(encoded)} >>\nstream\n".encode() + encoded + b"endstream")
    objects[1] = f"<< /Type /Pages /Count {pages} /Kids [{' '.join(kids)}] >>".encode()
    result = b"%PDF-1.7\n"
    offsets = []
    for number, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{number} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(result)
    result += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    result += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets)
    return result + f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


class MemoryStore:
    def __init__(self, data):
        self.data = data
        self.objects = {}
        self.downloads = 0

    def inspect(self, key, version=None):
        return {"eTag": hashlib.sha256(self.data).hexdigest(), "sizeBytes": len(self.data), "versionId": version}

    def read_json(self, key):
        return copy.deepcopy(self.objects.get(key))

    def download(self, key, path, identity, version, max_bytes):
        self.downloads += 1
        path.write_bytes(self.data)

    def upload(self, path, key, content_type):
        self.objects[key] = path.read_bytes()

    def write_json(self, key, result):
        self.objects[key] = copy.deepcopy(result)


class JobsTest(unittest.TestCase):
    def setUp(self):
        self.settings = Settings("private-bucket", "yesulin/dev/private/pdf-extractions/inputs/",
                                 "yesulin/dev/private/pdf-extractions/results/")
        self.job_id = "22b0664c-477a-46ef-87a1-83acf1b6a3c4"
        self.event = {"jobId": self.job_id, "source": {"bucket": self.settings.bucket,
                      "key": f"{self.settings.input_prefix}{self.job_id}/source.pdf"}}

    def test_original_preserved_result_references_private_images_and_text(self):
        original = sample_pdf()
        store, notifications = MemoryStore(original), []
        completion = process_job(self.event, self.settings, store, notifications.append)
        result = store.objects[completion["resultKey"]]
        self.assertEqual("COMPLETED", completion["status"])
        self.assertIn("Yesulin PDF test", result["pages"][0]["text"])
        image = result["pages"][0]["images"][0]
        self.assertTrue(image["key"].startswith(self.settings.result_prefix))
        self.assertTrue(store.objects[image["key"]].startswith(b"\x89PNG"))
        self.assertEqual(hashlib.sha256(original).hexdigest(), result["source"]["sha256"])
        self.assertEqual(original, store.data)
        self.assertNotIn("Yesulin PDF test", json.dumps(completion))
        self.assertEqual([completion], notifications)

    def test_callback_retry_reuses_result_without_downloading_pdf(self):
        store = MemoryStore(sample_pdf())

        def broken_callback(completion):
            raise RuntimeError("temporary server outage")

        with self.assertRaises(RuntimeError):
            process_job(self.event, self.settings, store, broken_callback)
        completion = process_job(self.event, self.settings, store, lambda result: None)
        self.assertTrue(completion["reused"])
        self.assertEqual(1, store.downloads)

    def test_changed_source_or_options_cannot_replace_same_job_result(self):
        store = MemoryStore(sample_pdf())
        process_job(self.event, self.settings, store, lambda result: None)
        store.data = sample_pdf("Changed text")
        with self.assertRaisesRegex(ValueError, "CHANGED_USE_NEW_JOB_ID"):
            process_job(self.event, self.settings, store, lambda result: None)

    def test_text_only_has_no_images_or_generated_page_previews(self):
        self.event["options"] = {"extractImages": False, "includeRegions": False}
        store = MemoryStore(sample_pdf())
        completion = process_job(self.event, self.settings, store, lambda result: None)
        page = store.objects[completion["resultKey"]]["pages"][0]
        self.assertEqual([], page["images"])
        self.assertEqual([], page["regions"])
        self.assertEqual(1, len(store.objects))

    def test_invalid_job_bucket_key_and_non_boolean_options_rejected(self):
        for mutate in [lambda e: e.update(jobId="../../bad"),
                       lambda e: e["source"].update(bucket="other-team-bucket"),
                       lambda e: e["source"].update(key="yesulin/prod/private/source.pdf"),
                       lambda e: e.update(options={"extractImages": "false"}),
                       lambda e: e.update(options={"callbackUrl": "https://untrusted.example"})]:
            event = copy.deepcopy(self.event)
            mutate(event)
            with self.assertRaises(ValueError):
                process_job(event, self.settings, MemoryStore(sample_pdf()), lambda result: None)

    def test_enforced_page_limit_is_explicit_failure_without_partial_success(self):
        settings = replace(self.settings, limits=Limits(max_pages=1))
        store = MemoryStore(sample_pdf(pages=2))
        completion = process_job(self.event, settings, store, lambda result: None)
        self.assertEqual("FAILED", completion["status"])
        self.assertEqual("PAGE_LIMIT_EXCEEDED", store.objects[completion["resultKey"]]["errorCode"])

    def test_invalid_pdf_persists_machine_readable_failure(self):
        store = MemoryStore(b"not a PDF")
        completion = process_job(self.event, self.settings, store, lambda result: None)
        self.assertEqual("FAILED", completion["status"])
        self.assertEqual("INVALID_PDF_SIGNATURE", store.objects[completion["resultKey"]]["errorCode"])

    def test_oversized_file_rejected_before_download(self):
        settings = replace(self.settings, limits=Limits(max_file_bytes=1))
        store = MemoryStore(sample_pdf())
        with self.assertRaisesRegex(ExtractionError, "FILE_SIZE_LIMIT"):
            process_job(self.event, settings, store, lambda result: None)
        self.assertEqual(0, store.downloads)

    def test_oversized_manifest_is_explicit_failure_not_an_unreadable_success(self):
        store = MemoryStore(sample_pdf())
        oversized = {"status": "COMPLETED", "pages": [{"number": 1, "text": "가" * 800_000, "images": []}]}
        with patch("application.jobs.extract_pdf", return_value=oversized):
            completion = process_job(self.event, self.settings, store, lambda result: None)
        result = store.objects[completion["resultKey"]]
        self.assertEqual("FAILED", result["status"])
        self.assertEqual("RESULT_SIZE_LIMIT_EXCEEDED", result["errorCode"])
        self.assertEqual([], result["pages"])
        self.assertLess(len(json.dumps(result).encode()), 2048)

    def test_resource_limits_surface_partial_result_and_ocr_hint(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.pdf"
            source.write_bytes(sample_pdf(text="", pages=2))
            result = extract_pdf(source, root / "images", limits=Limits(max_images=1, image_max_edge=64))
            self.assertEqual("PARTIAL", result["status"])
            self.assertTrue(all(p["needsOcr"] for p in result["pages"]))
            image = result["pages"][0]["images"][0]
            self.assertLessEqual(max(image["pixelWidth"], image["pixelHeight"]), 64)
            self.assertEqual([], result["pages"][1]["images"])

    def test_rotated_page_coordinates_are_normalized(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.pdf"
            source.write_bytes(sample_pdf(rotation=90))
            result = extract_pdf(source, root / "images")
            page = result["pages"][0]
            self.assertEqual(90, page["rotation"])
            for region in page["regions"] + page["images"]:
                left, top, right, bottom = region["bbox"]
                self.assertTrue(0 <= left <= right <= 1 and 0 <= top <= bottom <= 1)

    def test_low_remaining_time_aborts_without_completed_manifest(self):
        store = MemoryStore(sample_pdf())
        with self.assertRaisesRegex(ExtractionError, "TIME_LIMIT"):
            process_job(self.event, self.settings, store, lambda result: None, remaining_ms=lambda: 1000)
        self.assertEqual({}, store.objects)


if __name__ == "__main__":
    unittest.main()
