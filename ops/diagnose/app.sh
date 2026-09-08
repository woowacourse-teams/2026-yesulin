#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/diagnose/app.sh" >&2
  exit 1
fi

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
df -hT / /opt/yesulin 2>/dev/null || df -hT /
swapon --show || true

section "services"
for service in yesulin.service codedeploy-agent.service \
  snap.amazon-ssm-agent.amazon-ssm-agent.service; do
  printf '%-48s ' "$service"
  systemctl is-active "$service" 2>/dev/null || true
done

section "current release"
readlink -f /opt/yesulin/current 2>/dev/null || echo "current release: missing"

section "listening ports"
ss -lntp | grep -E ':80\b' || echo "80 listener: missing"

section "database network"
environment_file=/etc/yesulin/yesulin.env
database_host=""
log_file=/var/log/yesulin/yesulin.log
if [ -r "$environment_file" ]; then
  database_host="$(sed -n 's|^SPRING_DATASOURCE_URL=jdbc:mysql://\([^:/?]*\).*|\1|p' "$environment_file")"
  configured_log_file="$(sed -n 's/^LOG_FILE=//p' "$environment_file" | tail -n 1)"
  if [ -n "$configured_log_file" ]; then
    log_file="$configured_log_file"
  fi
fi
if [ -n "$database_host" ]; then
  if timeout 5 bash -c 'exec 3<>/dev/tcp/"$1"/3306' _ "$database_host" 2>/dev/null; then
    echo "DB TCP 3306: reachable"
  else
    echo "DB TCP 3306: failed"
  fi
else
  echo "DB host: unavailable"
fi

section "recent application logs"
journalctl -u yesulin.service -n 100 --no-pager 2>&1 | redact

section "recent application file logs"
if [ -r "$log_file" ]; then
  tail -n 100 -- "$log_file" | redact
else
  echo "Application file log ($log_file): unavailable"
fi

section "recent deployment logs"
journalctl -u codedeploy-agent.service -n 50 --no-pager 2>&1 | redact
