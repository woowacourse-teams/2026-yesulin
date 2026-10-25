"""Provider credentials stay in Lambda. Send only extracted text and registered roles."""
import copy
import json
import os
import re
import urllib.error
import urllib.request

from application.applicant_info import ApplicantInfoProcessor, ModelFailure
from infrastructure.completion_api import NoRedirect


class GeminiModel:
    def __init__(self, key, model):
        if not key or not re.fullmatch(r"gemini-[a-zA-Z0-9._-]{1,100}", model):
            raise ValueError("GEMINI_CONFIGURATION_REQUIRED")
        self.key, self.model = key, model
        self.opener = urllib.request.build_opener(NoRedirect())

    def __call__(self, system, prompt, schema):
        # Keep provider-specific schema changes out of the canonical five-career bound.
        # Keep the canonical schema intact; application validation enforces the bound.
        wire_schema = copy.deepcopy(schema)
        profile = wire_schema.get("properties", {}).get("profile", {})
        profile.get("properties", {}).get("careers", {}).pop("maxItems", None)
        body = {"systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 16384,
                                     "responseMimeType": "application/json", "responseJsonSchema": wire_schema}}
        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            data=json.dumps(body, ensure_ascii=False).encode(), method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": self.key})
        try:
            with self.opener.open(request, timeout=25) as response:
                raw = response.read(1_048_577)
            if len(raw) > 1_048_576:
                raise ModelFailure("INVALID_MODEL_OUTPUT")
            data = json.loads(raw)
            candidates = data.get("candidates", [])
            if len(candidates) != 1 or candidates[0].get("finishReason") != "STOP":
                raise ModelFailure("INVALID_MODEL_OUTPUT")
            parts = candidates[0].get("content", {}).get("parts", [])
            return json.loads("".join(part.get("text", "") for part in parts if not part.get("thought")))
        except (urllib.error.URLError, TimeoutError, OSError):
            raise ModelFailure() from None
        except (ValueError, TypeError, KeyError, IndexError, AttributeError):
            raise ModelFailure("INVALID_MODEL_OUTPUT") from None


class BedrockModel:
    def __init__(self, client, model):
        if not model or len(model) > 150:
            raise ValueError("BEDROCK_MODEL_CONFIGURATION_REQUIRED")
        self.client, self.model = client, model

    def __call__(self, system, prompt, schema):
        try:
            result = self.client.converse(modelId=self.model, system=[{"text": system}],
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"maxTokens": 16384, "temperature": 0},
                outputConfig={"textFormat": {"type": "json_schema", "structure": {"jsonSchema": {
                    "schema": json.dumps(schema), "name": "applicant_info"}}}})
            if result.get("stopReason") != "end_turn":
                raise ModelFailure("INVALID_MODEL_OUTPUT")
            return json.loads("".join(item.get("text", "") for item in result["output"]["message"]["content"]))
        except ModelFailure:
            raise
        except Exception:
            # SDK exceptions can contain request details. Do not leak them in logs or callbacks.
            raise ModelFailure() from None


def configured_processor(context):
    provider = os.environ.get("PDF_AI_PROVIDER", "none")
    if provider == "none":
        return None
    if provider == "gemini":
        model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
        invoke = GeminiModel(os.environ.get("GEMINI_API_KEY", ""), model)
    elif provider == "bedrock":
        import boto3
        from botocore.config import Config
        model = os.environ.get("BEDROCK_MODEL_ID", "")
        invoke = BedrockModel(boto3.client("bedrock-runtime", region_name=os.environ.get("BEDROCK_REGION"),
            config=Config(connect_timeout=3, read_timeout=25, retries={"total_max_attempts": 1})), model)
    else:
        raise ValueError("INVALID_PDF_AI_PROVIDER")
    return ApplicantInfoProcessor(provider, model, invoke, context)
