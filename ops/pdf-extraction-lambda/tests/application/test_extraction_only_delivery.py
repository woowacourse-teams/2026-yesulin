import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from infrastructure.completion_api import CompletionApi

URL = "https://api.example.test/internal/v1/pdf-extractions/completions"
TOKEN = "t" * 32


class Store:
    def __init__(self, result, legacy=None):
        self.result, self.legacy = result, legacy

    def read_json(self, key):
        if key.endswith("result.json"):
            return self.result
        return self.legacy if key.endswith("applicant-info-v2.json") else None


class Response:
    def __init__(self, status):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size):
        return b""


class Opener:
    def __init__(self, status=200):
        self.status, self.requests = status, []

    def open(self, request, timeout):
        self.requests.append(request)
        return Response(self.status)


class ExtractionOnlyDeliveryTest(unittest.TestCase):
    def setUp(self):
        self.completion = {"jobId": "job-1", "pipelineVersion": "pdfium-v1", "status": "COMPLETED",
                           "resultKey": "results/job-1/pdfium-v1/result.json"}
        self.result = {"jobId": "job-1", "pipelineVersion": "pdfium-v1", "status": "COMPLETED",
                       "source": {"key": "inputs/job-1/source.pdf"},
                       "pages": [{"number": 1, "text": "본문", "images": []}]}

    def api(self, status=200):
        api = CompletionApi(Store(self.result), URL, TOKEN)
        api.opener = Opener(status)
        return api

    def test_posts_cached_result_without_ai_fields(self):
        api = self.api()
        api.notify(self.completion)
        request = api.opener.requests[0]
        self.assertEqual(URL, request.full_url)
        body = json.loads(request.data)
        self.assertEqual(self.result, body["result"])
        self.assertNotIn("applicantInfo", body["result"])
        self.assertFalse(hasattr(api, "processor"))
        self.assertFalse(hasattr(api, "context"))

    def test_preserves_legacy_cached_callback_without_model_or_context_calls(self):
        info = {"version": "applicant-info-v2", "status": "COMPLETED"}
        result = {**self.result, "fingerprint": "source-identity"}
        api = CompletionApi(Store(result, {"sourceFingerprint": "source-identity", "applicantInfo": info}),
                            URL, TOKEN)
        api.opener = Opener()
        api.notify(self.completion)
        self.assertEqual(info, json.loads(api.opener.requests[0].data)["result"]["applicantInfo"])
        self.assertEqual(1, len(api.opener.requests))

    def test_rejects_legacy_cache_for_a_different_source(self):
        api = CompletionApi(Store({**self.result, "fingerprint": "source"},
                                  {"sourceFingerprint": "different", "applicantInfo": {}}), URL, TOKEN)
        api.opener = Opener()
        with self.assertRaisesRegex(RuntimeError, "FINGERPRINT_MISMATCH"):
            api.notify(self.completion)
        self.assertEqual([], api.opener.requests)

    def test_failed_delivery_raises_for_lambda_retry(self):
        with self.assertRaises(RuntimeError):
            self.api(status=500).notify(self.completion)


if __name__ == "__main__":
    unittest.main()
