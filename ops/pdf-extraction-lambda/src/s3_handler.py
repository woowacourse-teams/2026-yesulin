"""S3 ObjectCreated adapter. No API Gateway, callbacks, Bedrock or application queue."""
import json
import os
import re
from urllib.parse import unquote_plus

import boto3
from botocore.config import Config

from application.jobs import Settings, process_job
from infrastructure.aws_storage import S3Store


def requests_from_s3(event, settings):
    if event.get("Event") == "s3:TestEvent":
        return []
    records = event.get("Records")
    if not isinstance(records, list) or not 1 <= len(records) <= 10:
        raise ValueError("INVALID_S3_EVENT")
    requests = []
    for record in records:
        if record.get("eventSource") != "aws:s3" or not record.get("eventName", "").startswith("ObjectCreated:"):
            raise ValueError("ONLY_S3_OBJECT_CREATION_ALLOWED")
        source = record.get("s3", {})
        if source.get("bucket", {}).get("name") != settings.bucket:
            raise ValueError("SOURCE_BUCKET_NOT_ALLOWED")
        item = source.get("object", {})
        key = unquote_plus(item.get("key", ""))
        match = re.fullmatch(re.escape(settings.input_prefix) + r"([0-9a-f-]{36})/source\.pdf", key)
        if not match:
            raise ValueError("SOURCE_KEY_NOT_ALLOWED")
        source = {"bucket": settings.bucket, "key": key}
        if item.get("versionId"):
            source["versionId"] = item["versionId"]
        requests.append({"jobId": match[1], "source": source,
                         "options": {"extractImages": True, "includeRegions": False}})
    return requests


def handler(event, context):
    try:
        settings = Settings(os.environ["PDF_BUCKET"], os.environ["PDF_INPUT_PREFIX"],
                            os.environ["PDF_RESULT_PREFIX"])
        client = boto3.client("s3", endpoint_url=os.environ.get("PDF_S3_ENDPOINT"),
                              config=Config(connect_timeout=5, read_timeout=30,
                                            retries={"total_max_attempts": 3, "mode": "standard"}))
        store = S3Store(client, settings.bucket)
        results = [process_job(request, settings, store, lambda completion: None,
                               remaining_ms=context.get_remaining_time_in_millis)
                   for request in requests_from_s3(event, settings)]
    except Exception as error:
        print(json.dumps({"event": "PDF_EXTRACTION_ERROR", "requestId": context.aws_request_id,
                          "errorType": type(error).__name__}))
        raise RuntimeError("PDF_EXTRACTION_JOB_FAILED") from None
    print(json.dumps({"event": "PDF_EXTRACTION_FINISHED", "requestId": context.aws_request_id,
                      "jobCount": len(results)}))
    return {"jobs": results}
