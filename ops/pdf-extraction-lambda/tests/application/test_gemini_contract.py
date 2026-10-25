import json
import unittest
from unittest.mock import MagicMock as Mock

from application.applicant_info import ModelFailure, schema
from application.profile_info import validate_profile
from infrastructure.applicant_models import GeminiModel


class GeminiContractTest(unittest.TestCase):
    def invoke(self, payload, canonical):
        model = GeminiModel('test-only', 'gemini-test')
        response = Mock()
        response.read.return_value = payload
        model.opener = Mock()
        model.opener.open.return_value.__enter__.return_value = response
        result = model('system', 'fictional text', canonical)
        request = model.opener.open.call_args.args[0]
        return result, json.loads(request.data), response

    def test_provider_schema_does_not_mutate_canonical_limit(self):
        canonical = schema([])
        value = {'ok': True}
        raw = json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps(value)}]}}]}).encode()
        result, request, _ = self.invoke(raw, canonical)
        self.assertEqual(value, result)
        self.assertEqual(5, canonical['properties']['profile']['properties']['careers']['maxItems'])
        self.assertNotIn('maxItems', request['generationConfig']['responseJsonSchema']['properties']['profile']['properties']['careers'])

    def test_korean_profile_over_old_64k_limit_is_read(self):
        value = {'text': '가' * 24000}
        raw = json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps(value, ensure_ascii=False)}]}}]}, ensure_ascii=False).encode()
        self.assertGreater(len(raw), 65536)
        result, _, response = self.invoke(raw, schema([]))
        self.assertEqual(value, result)
        response.read.assert_called_once_with(1048577)

    def test_oversized_response_rejected(self):
        with self.assertRaises(ModelFailure):
            self.invoke(b' ' * 1048577, schema([]))

    def test_application_still_rejects_more_than_five_careers(self):
        profile = {key: {'value': None, 'evidence': None} for key in ('birthDate', 'age', 'height', 'education')}
        profile['careers'] = [{'title': '작품', 'venue': None, 'part': None, 'genre': None, 'period': None, 'company': None, 'evidence': '작품'}] * 6
        self.assertFalse(validate_profile(profile, '작품'))
