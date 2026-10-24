"""One immutable S3 source PDF per job; S3 result persists before completion notification."""
import hashlib
import json
import re
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path

from application.extraction import PIPELINE_VERSION, ExtractionError, Limits, extract_pdf


@dataclass(frozen=True)
class Settings:
    bucket: str
    input_prefix: str
    result_prefix: str
    limits: Limits = Limits()

    def __post_init__(self):
        if not self.bucket or not self.input_prefix or not self.result_prefix:
            raise ValueError("STORAGE_CONFIGURATION_REQUIRED")
        for prefix in (self.input_prefix, self.result_prefix):
            if not prefix.endswith("/") or prefix.startswith("/") or ".." in prefix.split("/"):
                raise ValueError("INVALID_STORAGE_PREFIX")
        if self.input_prefix.startswith(self.result_prefix) or self.result_prefix.startswith(self.input_prefix):
            raise ValueError("INPUT_AND_RESULT_PREFIXES_MUST_BE_SEPARATE")


def validate_request(event, settings):
    if not isinstance(event, dict):
        raise ValueError("INVALID_EVENT")
    job_id = event.get("jobId", "")
    if not isinstance(job_id, str) or not re.fullmatch(r"[0-9a-f-]{36}", job_id):
        raise ValueError("INVALID_JOB_ID")
    if str(uuid.UUID(job_id)) != job_id:
        raise ValueError("INVALID_JOB_ID")
    source = event.get("source", {})
    if not isinstance(source, dict) or source.get("bucket") != settings.bucket:
        raise ValueError("SOURCE_BUCKET_NOT_ALLOWED")
    if source.get("key") != f"{settings.input_prefix}{job_id}/source.pdf":
        raise ValueError("SOURCE_KEY_NOT_ALLOWED")
    options = event.get("options", {})
    if not isinstance(options, dict) or set(options) - {"extractImages", "includeRegions"}:
        raise ValueError("INVALID_OPTIONS")
    for value in options.values():
        if not isinstance(value, bool):
            raise ValueError("OPTIONS_MUST_BE_BOOLEAN")
    version = source.get("versionId")
    if version is not None and (not isinstance(version, str) or not version or len(version) > 1024):
        raise ValueError("INVALID_SOURCE_VERSION")
    options = {"extractImages": options.get("extractImages", True),
               "includeRegions": options.get("includeRegions", True)}
    return job_id, source, options


def process_job(event, settings, store, notify, remaining_ms=None):
    job_id, source, options = validate_request(event, settings)
    identity = store.inspect(source["key"], source.get("versionId"))
    if identity["sizeBytes"] > settings.limits.max_file_bytes:
        raise ExtractionError("FILE_SIZE_LIMIT_EXCEEDED")
    fingerprint = hashlib.sha256(json.dumps({"source": source, "identity": identity, "options": options,
                                            "pipeline": PIPELINE_VERSION}, sort_keys=True).encode()).hexdigest()
    result_key = f"{settings.result_prefix}{job_id}/{PIPELINE_VERSION}/result.json"
    existing = store.read_json(result_key)
    if existing is not None:
        if existing.get("fingerprint") != fingerprint:
            raise ValueError("JOB_SOURCE_OR_OPTIONS_CHANGED_USE_NEW_JOB_ID")
        completion = {"jobId": job_id, "status": existing["status"], "resultKey": result_key,
                      "pipelineVersion": PIPELINE_VERSION, "reused": True}
        notify(completion)
        return completion
    with tempfile.TemporaryDirectory(prefix="yesulin-pdf-") as directory:
        local_pdf, assets = Path(directory) / "source.pdf", Path(directory) / "assets"
        store.download(source["key"], local_pdf, identity, source.get("versionId"), settings.limits.max_file_bytes)
        with local_pdf.open("rb") as stream:
            source_sha = hashlib.file_digest(stream, "sha256").hexdigest()
        try:
            result = extract_pdf(local_pdf, assets, limits=settings.limits,
                                 extract_images=options["extractImages"], include_regions=options["includeRegions"],
                                 remaining_ms=remaining_ms)
        except ExtractionError as error:
            if str(error) == "PROCESSING_TIME_LIMIT_APPROACHING":
                raise
            result = {"schemaVersion": 1, "pipelineVersion": PIPELINE_VERSION,
                      "status": "FAILED", "errorCode": str(error), "pages": []}
        result.update({"jobId": job_id, "fingerprint": fingerprint, "options": options,
                       "source": {**source, **identity, "sha256": source_sha}})
        uploads = []
        for page in result["pages"]:
            for image in page["images"]:
                if image["status"] != "EXTRACTED":
                    continue
                name = image.pop("fileName")
                image["key"] = f"{settings.result_prefix}{job_id}/{PIPELINE_VERSION}/images/{name}"
                uploads.append((assets / name, image["key"]))
        # Spring 결과 읽기 상한과 맞춘다. 너무 큰 manifest를 정상 결과로 저장하지 않는다.
        if len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > 2 * 1024 * 1024:
            result.update({"status": "FAILED", "errorCode": "RESULT_SIZE_LIMIT_EXCEEDED", "pages": []})
        else:
            for path, key in uploads:
                store.upload(path, key, "image/png")
        store.write_json(result_key, result)
    completion = {"jobId": job_id, "status": result["status"], "resultKey": result_key,
                  "pipelineVersion": PIPELINE_VERSION, "reused": False}
    notify(completion)
    return completion
