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
# DEV는 기본값, PROD는 /etc/yesulin/backup.env에서 이름과 설명을 바꾼다.
SNAPSHOT_NAME="${SNAPSHOT_NAME:-yesulin-db-staging-weekly}"
BACKUP_LABEL="${BACKUP_LABEL:-staging}"
# 개인정보 처리방침의 "백업은 90일 순환 방식으로 만료"에 맞춘다.
RETENTION_DAYS="${RETENTION_DAYS:-90}"

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
  --description "yesulin $BACKUP_LABEL MySQL crash-consistent snapshot $timestamp" \
  --tag-specifications \
    "ResourceType=snapshot,Tags=[{Key=Name,Value=$SNAPSHOT_NAME},{Key=Service,Value=techcourse},{Key=Role,Value=techcourse-etc},{Key=ProjectTeam,Value=yesulin},{Key=RetentionDays,Value=$RETENTION_DAYS}]" \
  --region "$AWS_REGION" \
  --query SnapshotId \
  --output text \
  --no-cli-pager)"

echo "EBS snapshot requested: $snapshot_id ($volume_id)"
echo "This is crash-consistent. The daily logical backup remains the primary restore source."

# 같은 이름의 스냅샷 중 보관 기간이 지난 것만 지운다. 방금 만든 스냅샷과 다른 이름의 스냅샷은 건드리지 않는다.
cutoff="$(date -u -d "-$RETENTION_DAYS days" +%Y-%m-%dT%H:%M:%S)"
expired_ids="$(aws ec2 describe-snapshots \
  --owner-ids self \
  --filters "Name=tag:Name,Values=$SNAPSHOT_NAME" "Name=tag:ProjectTeam,Values=yesulin" \
  --query "Snapshots[?StartTime<'$cutoff'].SnapshotId" \
  --output text \
  --region "$AWS_REGION" \
  --no-cli-pager)"

for expired_id in $expired_ids; do
  if [ "$expired_id" = "$snapshot_id" ] || [ "$expired_id" = "None" ]; then
    continue
  fi
  aws ec2 delete-snapshot --snapshot-id "$expired_id" --region "$AWS_REGION" --no-cli-pager
  echo "Expired EBS snapshot deleted: $expired_id (older than $RETENTION_DAYS days)"
done
