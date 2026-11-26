"""Merge one preview queue target into an exported S3 notification configuration."""
import argparse
import json
import sys


def merge(config, queue_arn, originals):
    if not originals.endswith("private/pdf-extractions/originals/"):
        raise ValueError("Expected the private review originals prefix")
    notification_id = "review-documents-" + originals.strip("/").replace("/", "-")
    if len(notification_id) > 255:
        raise ValueError("Notification ID exceeds S3 limit")
    config.pop("ResponseMetadata", None)
    targets = config.setdefault("QueueConfigurations", [])
    targets[:] = [target for target in targets if target.get("Id") != notification_id]
    targets.append({
        "Id": notification_id,
        "QueueArn": queue_arn,
        "Events": ["s3:ObjectCreated:*"],
        "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": originals}]}},
    })
    return config


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("queue_arn")
    parser.add_argument("originals", help="Full private S3 prefix ending in originals/")
    args = parser.parse_args()
    json.dump(merge(json.load(sys.stdin), args.queue_arn, args.originals), sys.stdout, indent=2)
    print()
