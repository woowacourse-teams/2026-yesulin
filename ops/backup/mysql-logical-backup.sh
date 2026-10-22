#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/backup/mysql-logical-backup.sh" >&2
  exit 1
fi

CONTAINER_NAME="${CONTAINER_NAME:-yesulin-mysql}"
BACKUP_BUCKET="${BACKUP_BUCKET:-techcourse-project-2026}"
BACKUP_PREFIX="${BACKUP_PREFIX:-yesulin/backups/mysql}"
# 파일 이름에 넣을 환경 이름. DEV는 staging, PROD는 /etc/yesulin/backup.env에서 prod로 바꾼다.
BACKUP_LABEL="${BACKUP_LABEL:-staging}"
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

mysql_in_container() {
  docker exec -i "$CONTAINER_NAME" sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --user=root --batch --skip-column-names "$MYSQL_DATABASE"'
}

install -d -o root -g root -m 0700 "$LOCAL_BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="yesulin-$BACKUP_LABEL-$timestamp.sql.gz"
sql_file="$(mktemp "$LOCAL_BACKUP_DIR/.mysql-backup.XXXXXX.sql")"
gzip_file="$LOCAL_BACKUP_DIR/$backup_name"
checksum_file="$gzip_file.sha256"
counts_file="$gzip_file.counts.tsv"

cleanup() {
  rm -f "$sql_file" "$gzip_file" "$checksum_file" "$counts_file"
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

# 복구 연습에서 비교할 표별 행 수를 덤프 직후에 남긴다. 덤프와 별도 조회라 그 사이 쓰기가 있던 표는 조금 다를 수 있다.
count_query="$(mysql_in_container <<'SQL'
SET SESSION group_concat_max_len = 1000000;
SELECT GROUP_CONCAT(
  CONCAT('SELECT ''', table_name, ''', COUNT(*) FROM `', table_name, '`')
  ORDER BY table_name SEPARATOR ' UNION ALL ')
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
SQL
)"
printf '%s;\n' "$count_query" | mysql_in_container > "$counts_file"
chmod 0600 "$counts_file"

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
aws s3 cp "$counts_file" "$s3_directory/$backup_name.counts.tsv" \
  --region "$AWS_REGION" --sse AES256 --only-show-errors

echo "MySQL logical backup uploaded: $s3_directory/$backup_name"
echo "Tables counted: $(wc -l < "$counts_file")"
