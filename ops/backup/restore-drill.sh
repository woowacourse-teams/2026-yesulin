#!/bin/sh
set -eu

# S3의 논리 백업을 같은 DB 서버의 임시 MySQL 컨테이너에 되살려 걸린 시간과 표별 행 수를 확인한다.
# 운영 MySQL에는 쓰지 않는다. 임시 컨테이너는 네트워크 없이 띄우고 끝나면 컨테이너·내려받은 파일을 모두 지운다.
# 사용법: sudo sh restore-drill.sh            # 가장 최근 백업
#        sudo sh restore-drill.sh s3://.../yesulin-prod-20261022T....sql.gz

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/backup/restore-drill.sh [S3_URI]" >&2
  exit 1
fi

# 환경별 값은 /etc/yesulin/backup.env에 둔다(systemd와 수동 실행이 같은 값을 쓰게). 없으면 DEV 기본값을 쓴다.
if [ -r /etc/yesulin/backup.env ]; then
  . /etc/yesulin/backup.env
fi

CONTAINER_NAME="${CONTAINER_NAME:-yesulin-mysql}"
BACKUP_BUCKET="${BACKUP_BUCKET:-techcourse-project-2026}"
BACKUP_PREFIX="${BACKUP_PREFIX:-yesulin/backups/mysql}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
DRILL_CONTAINER="${DRILL_CONTAINER:-yesulin-restore-drill}"
# 운영 MySQL(상한 700MiB)과 같은 서버에서 돌므로 작게 띄운다. swap이 없어 메모리가 모자라면 이 컨테이너가 먼저 종료되게 한다.
DRILL_MEMORY="${DRILL_MEMORY:-384m}"
MIN_AVAILABLE_MIB="${MIN_AVAILABLE_MIB:-600}"
# sort와 join이 같은 정렬 기준을 쓰게 한다.
export LC_ALL=C

for command_name in aws docker gzip sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: $command_name" >&2
    exit 1
  fi
done

available_mib="$(awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo)"
if [ "$available_mib" -lt "$MIN_AVAILABLE_MIB" ]; then
  echo "Not enough memory for a restore drill: ${available_mib}MiB available, ${MIN_AVAILABLE_MIB}MiB required" >&2
  exit 1
fi
if docker inspect "$DRILL_CONTAINER" >/dev/null 2>&1; then
  echo "A previous drill container still exists: $DRILL_CONTAINER (remove it first)" >&2
  exit 1
fi

now() {
  date +%s
}
kst() {
  TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'
}

work_dir="$(mktemp -d /var/tmp/yesulin-restore-drill.XXXXXX)"
chmod 0700 "$work_dir"
cleanup() {
  docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

drill_started="$(now)"
echo "Drill started: $(kst)"

backup_uri="${1:-}"
if [ -z "$backup_uri" ]; then
  latest_key="$(aws s3 ls "s3://$BACKUP_BUCKET/$BACKUP_PREFIX/" --recursive --region "$AWS_REGION" \
    | awk '{ print $4 }' | grep '\.sql\.gz$' | sort | tail -n 1)"
  if [ -z "$latest_key" ]; then
    echo "No backup found under s3://$BACKUP_BUCKET/$BACKUP_PREFIX/" >&2
    exit 1
  fi
  backup_uri="s3://$BACKUP_BUCKET/$latest_key"
fi
backup_name="$(basename "$backup_uri")"
echo "Backup: $backup_uri"

step_started="$(now)"
aws s3 cp "$backup_uri" "$work_dir/$backup_name" --region "$AWS_REGION" --only-show-errors
aws s3 cp "$backup_uri.sha256" "$work_dir/$backup_name.sha256" --region "$AWS_REGION" --only-show-errors
if aws s3 cp "$backup_uri.counts.tsv" "$work_dir/$backup_name.counts.tsv" \
  --region "$AWS_REGION" --only-show-errors 2>/dev/null; then
  has_counts=1
else
  has_counts=0
fi
(cd "$work_dir" && sha256sum -c "$backup_name.sha256")
gzip -t "$work_dir/$backup_name"
download_seconds=$(( $(now) - step_started ))
echo "Downloaded and checksum verified: $(du -h "$work_dir/$backup_name" | cut -f1), ${download_seconds}s"

image="$(docker inspect "$CONTAINER_NAME" --format '{{.Config.Image}}')"
drill_password="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
step_started="$(now)"
docker run -d --name "$DRILL_CONTAINER" --network none --memory "$DRILL_MEMORY" --oom-score-adj 1000 \
  -e MYSQL_ROOT_PASSWORD="$drill_password" \
  "$image" \
  --innodb-buffer-pool-size=32M --performance-schema=OFF --skip-log-bin >/dev/null

drill_mysql() {
  docker exec -i -e MYSQL_PWD="$drill_password" "$DRILL_CONTAINER" \
    mysql --user=root --batch --skip-column-names "$@"
}

attempt=0
until drill_mysql -e 'SELECT 1' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 90 ]; then
    echo "Temporary MySQL did not become ready" >&2
    docker logs --tail 30 "$DRILL_CONTAINER" >&2 || true
    exit 1
  fi
  sleep 2
done
startup_seconds=$(( $(now) - step_started ))
echo "Temporary MySQL ready ($image, network none, memory $DRILL_MEMORY): ${startup_seconds}s"

step_started="$(now)"
echo "Restore started: $(kst)"
gzip -cd "$work_dir/$backup_name" | drill_mysql
restore_seconds=$(( $(now) - step_started ))
echo "Restore finished: $(kst), ${restore_seconds}s"

database="$(gzip -cd "$work_dir/$backup_name" \
  | sed -n 's/^CREATE DATABASE .*`\([^`]*\)`.*/\1/p' | head -n 1)"
count_query="$(drill_mysql "$database" <<'SQL'
SET SESSION group_concat_max_len = 1000000;
SELECT GROUP_CONCAT(
  CONCAT('SELECT ''', table_name, ''', COUNT(*) FROM `', table_name, '`')
  ORDER BY table_name SEPARATOR ' UNION ALL ')
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
SQL
)"
printf '%s;\n' "$count_query" | drill_mysql "$database" | sort > "$work_dir/restored.tsv"

restored_tables="$(wc -l < "$work_dir/restored.tsv")"
restored_rows="$(awk -F '\t' '{ sum += $2 } END { print sum + 0 }' "$work_dir/restored.tsv")"
echo "Restored database $database: $restored_tables tables, $restored_rows rows"

if [ "$has_counts" -eq 1 ]; then
  sort "$work_dir/$backup_name.counts.tsv" > "$work_dir/backup.tsv"
  echo
  echo "table	at_backup	restored	result"
  join -t "$(printf '\t')" -a 1 -a 2 -e MISSING -o '0,1.2,2.2' "$work_dir/backup.tsv" "$work_dir/restored.tsv" \
    | awk -F '\t' '{ result = ($2 == $3) ? "OK" : "DIFF"; print $1 "\t" $2 "\t" $3 "\t" result }' \
    | tee "$work_dir/compare.tsv"
  mismatches="$(grep -c 'DIFF$' "$work_dir/compare.tsv" || true)"
  echo
  echo "Row count check: $((restored_tables - mismatches)) / $restored_tables tables match the counts taken at backup time"
else
  mismatches=0
  echo "No counts file for this backup; compare restored counts with the live database instead."
fi

total_seconds=$(( $(now) - drill_started ))
echo
echo "Summary: download+verify ${download_seconds}s, temporary MySQL ${startup_seconds}s, restore ${restore_seconds}s, total ${total_seconds}s"
echo "Drill finished: $(kst). The temporary container and downloaded files are removed on exit."
# 행 수가 다른 표는 덤프와 행 수 조회 사이에 쓰기가 있던 표일 수 있으므로 실패로 끝내지 않고 위 표로 남긴다.
