#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/backup/create-ebs-snapshot.sh" >&2
  exit 1
fi
if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required" >&2
  exit 1
fi

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
DATA_MOUNT="${DATA_MOUNT:-/data/mysql}"
source_device="$(findmnt -n -o SOURCE "$DATA_MOUNT")"
if [ -z "$source_device" ] || [ ! -b "$source_device" ]; then
  echo "EBS device for $DATA_MOUNT is unavailable" >&2
  exit 1
fi

serial="$(lsblk -ndo SERIAL "$source_device" | tr -d '[:space:]')"
case "$serial" in
  vol-*) volume_id="$serial" ;;
  vol[0-9a-fA-F]*) volume_id="vol-${serial#vol}" ;;
  *)
    echo "Could not resolve an EBS volume ID from $source_device: $serial" >&2
    exit 1
    ;;
esac

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot_id="$(aws ec2 create-snapshot \
  --volume-id "$volume_id" \
  --description "yesulin staging MySQL crash-consistent snapshot $timestamp" \
  --tag-specifications \
    "ResourceType=snapshot,Tags=[{Key=Name,Value=yesulin-db-staging-weekly},{Key=Service,Value=techcourse},{Key=Role,Value=techcourse-etc},{Key=ProjectTeam,Value=yesulin},{Key=RetentionDays,Value=90}]" \
  --region "$AWS_REGION" \
  --query SnapshotId \
  --output text \
  --no-cli-pager)"

echo "EBS snapshot requested: $snapshot_id ($volume_id)"
echo "This is crash-consistent. The daily logical backup remains the primary restore source."
