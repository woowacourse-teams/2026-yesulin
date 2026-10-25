import json

from application.extraction import ExtractionError


class S3Store:
    def __init__(self, client, bucket):
        self.client, self.bucket = client, bucket

    def inspect(self, key, version=None):
        args = {"Bucket": self.bucket, "Key": key}
        if version:
            args["VersionId"] = version
        response = self.client.head_object(**args)
        return {"eTag": response["ETag"], "sizeBytes": response["ContentLength"],
                "versionId": response.get("VersionId")}

    def read_json(self, key):
        # A prefix-scoped ListBucket permission does not reliably turn a missing GetObject into 404.
        # Explicitly list the exact result prefix without granting visibility into other teams' objects.
        listing = self.client.list_objects_v2(Bucket=self.bucket, Prefix=key, MaxKeys=1)
        if not any(item["Key"] == key for item in listing.get("Contents", [])):
            return None
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
        except self.client.exceptions.ClientError as error:
            if error.response["Error"]["Code"] in {"NoSuchKey", "404"}:
                return None
            raise
        body = response["Body"]
        try:
            return json.load(body)
        finally:
            body.close()

    def download(self, key, path, identity, version, max_bytes):
        args = {"Bucket": self.bucket, "Key": key, "IfMatch": identity["eTag"]}
        selected_version = version or identity.get("versionId")
        if selected_version:
            args["VersionId"] = selected_version
        response = self.client.get_object(**args)
        body, size = response["Body"], 0
        try:
            with path.open("wb") as stream:
                for chunk in body.iter_chunks(chunk_size=1024 * 1024):
                    size += len(chunk)
                    if size > max_bytes:
                        raise ExtractionError("FILE_SIZE_LIMIT_EXCEEDED")
                    stream.write(chunk)
        finally:
            body.close()
        if size != identity["sizeBytes"]:
            raise ExtractionError("SOURCE_SIZE_CHANGED")

    def upload(self, path, key, content_type):
        with path.open("rb") as stream:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=stream, ContentLength=path.stat().st_size,
                                   ContentType=content_type, ServerSideEncryption="AES256", CacheControl="no-store")

    def write_json(self, key, result):
        self.client.put_object(Bucket=self.bucket, Key=key,
                               Body=json.dumps(result, ensure_ascii=False).encode("utf-8"),
                               ContentType="application/json; charset=utf-8", ServerSideEncryption="AES256",
                               CacheControl="no-store")

    def write_json_once(self, key, result):
        try:
            self.client.put_object(Bucket=self.bucket, Key=key,
                                   Body=json.dumps(result, ensure_ascii=False).encode("utf-8"),
                                   ContentType="application/json; charset=utf-8", ServerSideEncryption="AES256",
                                   CacheControl="no-store", IfNoneMatch="*")
            return True
        except self.client.exceptions.ClientError as error:
            if error.response["Error"]["Code"] in {"PreconditionFailed", "412"}:
                return False
            raise
