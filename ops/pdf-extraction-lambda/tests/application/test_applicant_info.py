import copy
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from application.applicant_info import ApplicantInfoProcessor, MAX_TEXT_CHARS, ModelFailure, schema, validate_output


class Cache:
    def __init__(self):
        self.objects = {}

    def read_json(self, key):
        return copy.deepcopy(self.objects.get(key))

    def write_json_once(self, key, value):
        if key in self.objects:
            return False
        self.objects[key] = copy.deepcopy(value)
        return True


class ApplicantInfoTest(unittest.TestCase):
    def setUp(self):
        self.roles = [{"id": "e372681e-25cf-466a-af09-2c3309283e1d", "name": "강하루"}]
        self.text = "배우 소개\n성명: 가상배우\n이번 공연에 지원하는 배역은 강하루역입니다.\n경력: 앙상블 역"
        self.value = {"applicantName": "가상배우", "applicantNameEvidence": "성명: 가상배우",
                      "roleId": self.roles[0]["id"], "roleEvidence": "이번 공연에 지원하는 배역은 강하루역입니다."}
        self.result = {"fingerprint": "source-identity", "source": {"key": "scope/source.pdf"},
                       "pages": [{"number": 1, "text": self.text, "images": [{"key": "scope/images/a.png"}]}]}
        self.completion = {"jobId": "6c4ff9a9-9fdf-46f8-b5b6-14a5c9ed4366", "resultKey": "scope/pdfium-v1/result.json"}
        self.context = Mock(return_value={"jobId": self.completion["jobId"], "reviewId": "review",
                            "sourceFileKey": "scope/source.pdf", "resultStored": False, "roles": self.roles})
        self.invoke = Mock(return_value=self.value)
        self.processor = ApplicantInfoProcessor("gemini", "test-model", self.invoke, self.context)
        self.store = Cache()

    def test_structures_free_form_text_and_keeps_image_keys_outside_model(self):
        before = copy.deepcopy(self.result)
        enriched = self.processor.enrich(self.completion, self.result, self.store)
        self.assertEqual("COMPLETED", enriched["applicantInfo"]["status"])
        self.assertEqual(self.roles[0]["id"], enriched["applicantInfo"]["roleId"])
        prompt = json.loads(self.invoke.call_args.args[1])
        self.assertEqual({"roles": self.roles, "documentText": self.text}, prompt)
        self.assertNotIn("scope/", self.invoke.call_args.args[1])
        self.assertEqual(before, self.result)
        self.assertEqual(before["pages"], enriched["pages"])

    def test_callback_retry_reuses_model_result_and_does_not_call_context_again(self):
        first = self.processor.enrich(self.completion, self.result, self.store)
        second = self.processor.enrich(self.completion, self.result, self.store)
        self.assertEqual(first, second)
        self.invoke.assert_called_once()
        self.context.assert_called_once()

    def test_schema_limits_role_choice_and_rejects_hallucinated_or_extra_output(self):
        self.assertEqual([None, self.roles[0]["id"]], schema(self.roles)["properties"]["roleId"]["enum"])
        for change in ({"roleId": "6c4ff9a9-9fdf-46f8-b5b6-14a5c9ed4366"},
                       {"roleEvidence": "원문에 없는 배역 지원"}, {"applicantName": "다른사람"},
                       {"decision": "PASS"}, {"applicantName": 42}, {"roleEvidence": "x" * 501}):
            with self.subTest(change=change), self.assertRaises(ModelFailure):
                validate_output({**self.value, **change}, self.text, self.roles)

    def test_unknown_role_retains_only_grounded_name(self):
        self.invoke.return_value = {**self.value, "roleId": None, "roleEvidence": None}
        info = self.processor.enrich(self.completion, self.result, self.store)["applicantInfo"]
        self.assertEqual("COMPLETED", info["status"])
        self.assertIsNone(info["roleId"])
        self.assertEqual("가상배우", info["applicantName"])

    def test_control_character_in_model_quote_never_blocks_extracted_text_delivery(self):
        for control in ("\x00", "\x0c", "\x85"):
            with self.subTest(control=repr(control)):
                evidence = "강하루" + control + "역에 지원합니다."
                result = {**self.result, "pages": [{"text": self.text + "\n" + evidence}]}
                self.invoke.return_value = {**self.value, "roleEvidence": evidence}
                enriched = self.processor.enrich(self.completion, result, Cache())
                self.assertEqual("FAILED", enriched["applicantInfo"]["status"])
                self.assertEqual("INVALID_MODEL_OUTPUT", enriched["applicantInfo"]["reason"])
                self.assertEqual(result["pages"], enriched["pages"])

    def test_provider_failure_still_preserves_pdf_extraction_for_delivery(self):
        self.invoke.side_effect = ModelFailure()
        result = self.processor.enrich(self.completion, self.result, self.store)
        self.assertEqual("FAILED", result["applicantInfo"]["status"])
        self.assertEqual("PROVIDER_ERROR", result["applicantInfo"]["reason"])
        self.assertEqual(self.result["pages"], result["pages"])
        self.assertIsNone(result["applicantInfo"]["applicantName"])

    def test_missing_text_and_oversized_text_skip_without_calling_model(self):
        for text, reason in (("", "NO_TEXT"), ("x" * (MAX_TEXT_CHARS + 1), "TEXT_LIMIT_EXCEEDED")):
            with self.subTest(reason=reason):
                result = {**self.result, "pages": [{"text": text}]}
                info = self.processor.enrich(self.completion, result, Cache())["applicantInfo"]
                self.assertEqual("SKIPPED", info["status"])
                self.assertEqual(reason, info["reason"])
        self.invoke.assert_not_called()

    def test_source_context_and_cache_identity_mismatch_never_call_model(self):
        self.context.return_value["sourceFileKey"] = "other-review/source.pdf"
        with self.assertRaisesRegex(ValueError, "CONTEXT_IDENTITY"):
            self.processor.enrich(self.completion, self.result, self.store)
        self.store.objects["scope/pdfium-v1/applicant-info-v1.json"] = {"sourceFingerprint": "changed"}
        with self.assertRaisesRegex(ValueError, "SOURCE_CHANGED"):
            self.processor.enrich(self.completion, self.result, self.store)
        self.invoke.assert_not_called()

    def test_old_already_stored_payload_remains_unchanged_for_idempotent_callback(self):
        self.context.return_value["resultStored"] = True
        self.assertEqual(self.result, self.processor.enrich(self.completion, self.result, self.store))
        self.invoke.assert_not_called()
        self.assertEqual({}, self.store.objects)

    def test_low_remaining_time_defers_model_until_next_lambda_invocation(self):
        with self.assertRaisesRegex(RuntimeError, "TIME_LIMIT"):
            self.processor.enrich(self.completion, self.result, self.store, remaining_ms=lambda: 40_000)
        self.invoke.assert_not_called()
        self.assertEqual({}, self.store.objects)

    def test_simultaneous_duplicate_uses_published_winner(self):
        winner = {"sourceFingerprint": self.result["fingerprint"], "applicantInfo": {
                  "status": "COMPLETED", "applicantName": "가상배우", "roleId": None}}
        original = self.store.write_json_once

        def race(key, value):
            original(key, winner)
            return False

        self.store.write_json_once = race
        result = self.processor.enrich(self.completion, self.result, self.store)
        self.assertEqual(winner["applicantInfo"], result["applicantInfo"])


if __name__ == "__main__":
    unittest.main()
