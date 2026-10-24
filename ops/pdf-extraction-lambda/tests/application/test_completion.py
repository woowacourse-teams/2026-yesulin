import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from application.completion import completion_body


class CompletionBodyTest(unittest.TestCase):
    def setUp(self):
        self.completion = {"jobId": "job-1", "pipelineVersion": "pdfium-v1", "status": "COMPLETED"}
        self.result = {**self.completion, "source": {"key": "inputs/job-1/source.pdf"},
                       "pages": [{"number": 1, "text": "지원배역: 앙상블", "images": [
                           {"status": "EXTRACTED", "key": "results/job-1/images/1.png"}]}]}

    def test_direct_payload_contains_text_and_image_keys(self):
        body = completion_body(self.completion, self.result)
        self.assertEqual(self.result, body["result"])
        self.assertEqual("inputs/job-1/source.pdf", body["sourceFileKey"])
        self.assertEqual("지원배역: 앙상블", body["result"]["pages"][0]["text"])

    def test_rejects_another_job_or_status(self):
        for field, value in [("jobId", "job-2"), ("status", "FAILED"), ("pipelineVersion", "v2")]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                completion_body(self.completion, {**self.result, field: value})

    def test_rejects_missing_or_oversized_result(self):
        for result in [None, {**self.result, "source": {}},
                       {**self.result, "extra": "가" * (1024 * 1024)}]:
            with self.assertRaises(ValueError):
                completion_body(self.completion, result)
