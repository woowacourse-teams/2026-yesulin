"""Build the direct server completion contract without transferring temporary URLs."""
import json


def completion_body(completion, result):
    if not isinstance(result, dict):
        raise ValueError("COMPLETION_RESULT_MISSING")
    if (result.get("jobId") != completion["jobId"]
            or result.get("pipelineVersion") != completion["pipelineVersion"]
            or result.get("status") != completion["status"]):
        raise ValueError("COMPLETION_RESULT_IDENTITY_MISMATCH")
    source_key = result.get("source", {}).get("key")
    if not isinstance(source_key, str) or not source_key:
        raise ValueError("COMPLETION_SOURCE_MISSING")
    if len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 2 * 1024 * 1024:
        raise ValueError("COMPLETION_RESULT_TOO_LARGE")
    return {"jobId": completion["jobId"], "sourceFileKey": source_key,
            "pipelineVersion": completion["pipelineVersion"], "result": result}
