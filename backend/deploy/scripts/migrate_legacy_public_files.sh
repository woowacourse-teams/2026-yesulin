#!/bin/sh
set -eu

ENVIRONMENT_FILE=${ENVIRONMENT_FILE:-/etc/yesulin/yesulin.env}
MARKER_FILE=${MARKER_FILE:-/opt/yesulin/.legacy-public-files-migrated}

if [ -e "$MARKER_FILE" ]; then
  exit 0
fi

if [ ! -r "$ENVIRONMENT_FILE" ]; then
  echo "Missing $ENVIRONMENT_FILE" >&2
  exit 1
fi

BUCKET="$(sed -n 's/^YESULIN_STORAGE_S3_BUCKET=//p' "$ENVIRONMENT_FILE")"
KEY_PREFIX="$(sed -n 's/^YESULIN_STORAGE_S3_KEY_PREFIX=//p' "$ENVIRONMENT_FILE")"

if [ -z "$BUCKET" ] || [ -z "$KEY_PREFIX" ]; then
  echo "S3 bucket and key prefix must be configured" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is required to migrate legacy public files" >&2
  exit 1
fi

aws s3 sync \
  "s3://$BUCKET/$KEY_PREFIX/files/" \
  "s3://$BUCKET/$KEY_PREFIX/public/files/" \
  --only-show-errors

install -d -o root -g yesulin -m 0750 /opt/yesulin
touch "$MARKER_FILE"
chown root:yesulin "$MARKER_FILE"
chmod 0640 "$MARKER_FILE"
