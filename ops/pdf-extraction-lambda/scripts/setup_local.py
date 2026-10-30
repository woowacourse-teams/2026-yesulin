"""Configure only loopback LocalStack. Never discover real AWS credentials or endpoints."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# build.py가 준비한 pure-Python SDK를 재사용한다. 이 스크립트에서는 ARM64 추출 라이브러리를 로드하지 않는다.
sys.path.append(str(ROOT / "build/package"))

import boto3
REGION = "ap-northeast-2"
BUCKET = "yesulin-pdf-local"
FUNCTION = "yesulin-pdf-extractor-local"
PREFIX = "yesulin/local/private/pdf-extractions/"


def client(service):
    return boto3.client(service, endpoint_url="http://localhost:4568", region_name=REGION,
                        aws_access_key_id="test", aws_secret_access_key="test")


def main():
    s3, lamb = client("s3"), client("lambda")
    if not any(bucket["Name"] == BUCKET for bucket in s3.list_buckets()["Buckets"]):
        s3.create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION})
    s3.put_bucket_cors(Bucket=BUCKET, CORSConfiguration={"CORSRules": [{
        "AllowedOrigins": ["http://localhost:3201", "http://127.0.0.1:3201"],
        "AllowedMethods": ["PUT", "GET", "HEAD"], "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 300}]})
    if "--storage-only" in sys.argv:
        print(json.dumps({"mode": "localstack-storage-only", "bucket": BUCKET,
                          "lambdaChanged": False, "sqs": False}))
        return
    package = (ROOT / "build/yesulin-pdf-extractor-arm64.zip").read_bytes()
    environment = {"Variables": {"PDF_BUCKET": BUCKET, "PDF_INPUT_PREFIX": PREFIX + "inputs/",
                    "PDF_RESULT_PREFIX": PREFIX + "results/", "PDF_S3_ENDPOINT": "http://localstack:4566",
                    "PDF_COMPLETION_API_URL": "http://host.docker.internal:8093/internal/v1/pdf-extractions/completions",
                    "PDF_COMPLETION_API_TOKEN": "local-pdf-worker-token-for-localstack-only",
                    "PDF_LOCAL_CALLBACK": "true"}}
    provider = "none"
    if not any(f["FunctionName"] == FUNCTION for f in lamb.list_functions()["Functions"]):
        lamb.create_function(FunctionName=FUNCTION, Runtime="python3.12", Handler="s3_handler.handler",
                             Role="arn:aws:iam::000000000000:role/pdf-extraction-local",
                             Code={"ZipFile": package}, Architectures=["arm64"], MemorySize=1024,
                             Timeout=120, Environment=environment)
        lamb.get_waiter("function_active_v2").wait(FunctionName=FUNCTION)
        lamb.add_permission(FunctionName=FUNCTION, StatementId="local-s3-inputs", Action="lambda:InvokeFunction",
                            Principal="s3.amazonaws.com", SourceArn="arn:aws:s3:::" + BUCKET,
                            SourceAccount="000000000000")
    else:
        lamb.update_function_code(FunctionName=FUNCTION, ZipFile=package)
        lamb.get_waiter("function_updated_v2").wait(FunctionName=FUNCTION)
        lamb.update_function_configuration(FunctionName=FUNCTION, Handler="s3_handler.handler",
                                             Environment=environment)
        lamb.get_waiter("function_updated_v2").wait(FunctionName=FUNCTION)
    lamb.put_function_event_invoke_config(FunctionName=FUNCTION, MaximumRetryAttempts=2,
                                          MaximumEventAgeInSeconds=21600)
    lamb.put_function_concurrency(FunctionName=FUNCTION, ReservedConcurrentExecutions=2)
    arn = lamb.get_function_configuration(FunctionName=FUNCTION)["FunctionArn"]
    s3.put_bucket_notification_configuration(Bucket=BUCKET, NotificationConfiguration={
        "LambdaFunctionConfigurations": [{"Id": "pdf-inputs-only", "LambdaFunctionArn": arn,
            "Events": ["s3:ObjectCreated:*"], "Filter": {"Key": {"FilterRules": [
                {"Name": "prefix", "Value": PREFIX + "inputs/"}, {"Name": "suffix", "Value": "/source.pdf"}]}}}]})
    print(json.dumps({"mode": "localstack-only", "endpoint": "http://localhost:4568", "bucket": BUCKET,
                      "function": FUNCTION, "sqs": False, "aiProvider": provider}))


if __name__ == "__main__":
    main()
