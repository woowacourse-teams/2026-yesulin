#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/monitor/database.sh" >&2
  exit 1
fi

failed=0
if findmnt -rn /data/mysql >/dev/null 2>&1; then
  echo "OK /data/mysql mounted"
else
  echo "FAIL /data/mysql is not mounted" >&2
  failed=1
fi

data_usage="$(df -P /data/mysql | awk 'NR == 2 {gsub(/%/, "", $5); print $5}')"
if [ "$data_usage" -ge 80 ]; then
  echo "FAIL MySQL filesystem usage ${data_usage}%" >&2
  failed=1
else
  echo "OK MySQL filesystem usage ${data_usage}%"
fi

if systemctl is-active --quiet docker.service; then
  echo "OK service docker.service"
else
  echo "FAIL service docker.service" >&2
  failed=1
fi

health="$(docker inspect yesulin-mysql \
  --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
  2>/dev/null || true)"
if [ "$health" = healthy ]; then
  echo "OK container yesulin-mysql healthy"
else
  echo "FAIL container yesulin-mysql health=${health:-missing}" >&2
  failed=1
fi

if docker exec yesulin-mysql sh -c '
  MYSQL_PWD="$MYSQL_PASSWORD" exec mysql \
    --user="$MYSQL_USER" --database="$MYSQL_DATABASE" \
    --batch --skip-column-names --execute="SELECT 1"
' 2>/dev/null | grep -qx 1; then
  echo "OK MySQL application account query"
else
  echo "FAIL MySQL application account query" >&2
  failed=1
fi

exit "$failed"
