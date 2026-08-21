#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/backup/mysql-logical-backup.sh" >&2
  exit 1
fi

CONTAINER_NAME="${CONTAINER_NAME:-yesulin-mysql}"
BACKUP_BUCKET="${BACKUP_BUCKET:-techcourse-project-2026}"
BACKUP_PREFIX="${BACKUP_PREFIX:-yesulin/backups/mysql}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/var/backups/yesulin/mysql}"

for command_name in aws docker gzip sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: $command_name" >&2
    exit 1
  fi
done
if ! docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "MySQL container is unavailable: $CONTAINER_NAME" >&2
  exit 1
fi

install -d -o root -g root -m 0700 "$LOCAL_BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="yesulin-staging-$timestamp.sql.gz"
sql_file="$(mktemp "$LOCAL_BACKUP_DIR/.mysql-backup.XXXXXX.sql")"
gzip_file="$LOCAL_BACKUP_DIR/$backup_name"
checksum_file="$gzip_file.sha256"

cleanup() {
  rm -f "$sql_file" "$gzip_file" "$checksum_file"
}
trap cleanup EXIT
chmod 0600 "$sql_file"

docker exec "$CONTAINER_NAME" sh -c '
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump \
    --user=root \
    --single-transaction \
    --routines \
    --events \
    --triggers \
    --hex-blob \
    --set-gtid-purged=OFF \
    --databases "$MYSQL_DATABASE"
' > "$sql_file"

if [ ! -s "$sql_file" ] || ! grep -q '^CREATE DATABASE' "$sql_file"; then
  echo "Logical backup is empty or does not contain a database definition" >&2
  exit 1
fi

gzip -9 "$sql_file"
generated_gzip="$sql_file.gz"
mv "$generated_gzip" "$gzip_file"
chmod 0600 "$gzip_file"
gzip -t "$gzip_file"
(cd "$LOCAL_BACKUP_DIR" && sha256sum "$backup_name" > "$backup_name.sha256")

s3_directory="s3://$BACKUP_BUCKET/$BACKUP_PREFIX/$(date -u +%Y/%m/%d)"
aws s3 cp "$gzip_file" "$s3_directory/$backup_name" \
  --region "$AWS_REGION" --sse AES256 --only-show-errors
aws s3 cp "$checksum_file" "$s3_directory/$backup_name.sha256" \
  --region "$AWS_REGION" --sse AES256 --only-show-errors

echo "MySQL logical backup uploaded: $s3_directory/$backup_name"
