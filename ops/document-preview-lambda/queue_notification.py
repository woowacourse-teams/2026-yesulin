"""Merge one preview queue target into an exported S3 notification configuration."""
import argparse
import hashlib
import json
import sys


def merge(config, queue_arn, originals):
    if not originals.endswith("private/pdf-extractions/originals/"):
        raise ValueError("Expected the private review originals prefix")
    notification_id = "review-documents-" + hashlib.sha256(originals.encode()).hexdigest()
    legacy_id = "review-documents-" + originals.strip("/").replace("/", "-")
    rule = {
        "Id": notification_id,
        "QueueArn": queue_arn,
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": originals}]}},
    }
    for group in ("TopicConfigurations", "LambdaFunctionConfigurations"):
        if any(target.get("Id") == notification_id for target in config.get(group, [])):
            raise ValueError("Preview notification ID belongs to another destination")
    targets = []
    for target in config.get("QueueConfigurations", []):
        target_id = target.get("Id")
        if target_id in (notification_id, legacy_id):
            if target.get("Filter") == rule["Filter"] and target.get("Events") == rule["Events"]:
                continue
            if target_id == notification_id:
                raise ValueError("Preview notification ID belongs to a different rule")
        targets.append(target)
    config["QueueConfigurations"] = [*targets, rule]
    config.pop("ResponseMetadata", None)
    return config


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("queue_arn")
    parser.add_argument("originals", help="Full private S3 prefix ending in originals/")
    args = parser.parse_args()
    json.dump(merge(json.load(sys.stdin), args.queue_arn, args.originals), sys.stdout, indent=2)
    print()
