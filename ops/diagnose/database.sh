#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/diagnose/database.sh" >&2
  exit 1
fi

compose_file=/opt/yesulin-db/compose.yml
container_name=yesulin-mysql

redact() {
  sed -E \
    -e 's/(password|secret)([=:][[:space:]]*)[^[:space:],;]+/\1\2[REDACTED]/Ig' \
    -e 's/(authorization|cookie):.*/\1: [REDACTED]/Ig'
}

section() {
  printf '\n== %s ==\n' "$1"
}

section "host"
date -Is
hostname
uptime
uname -r

section "capacity"
free -h
df -hT / /data/mysql
swapon --show || true
findmnt /data/mysql || true

section "docker"
systemctl is-active docker.service || true
systemctl is-enabled docker.service || true
docker version --format 'Docker server {{.Server.Version}} ({{.Server.Os}}/{{.Server.Arch}})' 2>/dev/null || true

section "mysql container"
if [ -r "$compose_file" ]; then
  docker compose -f "$compose_file" ps
else
  echo "$compose_file: missing"
fi

if docker inspect "$container_name" >/dev/null 2>&1; then
  docker inspect "$container_name" \
    --format 'status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} restarts={{.RestartCount}}'
  docker stats --no-stream \
    --format 'name={{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}} memory_percent={{.MemPerc}}' \
    "$container_name"
else
  echo "$container_name: missing"
fi

section "mysql storage"
du -sh /data/mysql/data 2>/dev/null || true
ss -lntp | grep ':3306\b' || echo "3306 listener: missing"

section "recent mysql logs"
if docker inspect "$container_name" >/dev/null 2>&1; then
  docker logs --tail 100 "$container_name" 2>&1 | redact
else
  echo "$container_name: missing"
fi
