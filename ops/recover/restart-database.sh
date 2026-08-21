#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/recover/restart-database.sh --confirm yesulin-mysql" >&2
  exit 1
fi

if [ "${1:-}" != "--confirm" ] || [ "${2:-}" != "yesulin-mysql" ]; then
  echo "This restarts the staging database and interrupts active connections." >&2
  echo "Confirm with: sudo sh ops/recover/restart-database.sh --confirm yesulin-mysql" >&2
  exit 2
fi

compose_file=/opt/yesulin-db/compose.yml
container_name=yesulin-mysql
if [ ! -r "$compose_file" ]; then
  echo "$compose_file is missing" >&2
  exit 1
fi

docker compose -f "$compose_file" restart mysql

attempt=1
while [ "$attempt" -le 60 ]; do
  health="$(docker inspect "$container_name" \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [ "$health" = "healthy" ]; then
    echo "$container_name is healthy"
    exit 0
  fi
  sleep 2
  attempt=$((attempt + 1))
done

docker compose -f "$compose_file" ps || true
docker logs --tail 100 "$container_name" 2>&1 || true
echo "$container_name did not become healthy" >&2
exit 1
