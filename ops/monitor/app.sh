#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/monitor/app.sh" >&2
  exit 1
fi

failed=0
check_service() {
  if systemctl is-active --quiet "$1"; then
    echo "OK service $1"
  else
    echo "FAIL service $1" >&2
    failed=1
  fi
}

for service in yesulin.service codedeploy-agent.service \
  snap.amazon-ssm-agent.amazon-ssm-agent.service; do
  check_service "$service"
done

root_usage="$(df -P / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}')"
if [ "$root_usage" -ge 80 ]; then
  echo "FAIL root filesystem usage ${root_usage}%" >&2
  failed=1
else
  echo "OK root filesystem usage ${root_usage}%"
fi

readiness_status="$(curl --connect-timeout 1 --max-time 2 -sS \
  -o /dev/null -w '%{http_code}' \
  http://127.0.0.1:80/actuator/health/readiness || true)"

if [ "$readiness_status" = 200 ]; then
  echo "OK Spring readiness check"
else
  echo "FAIL Spring readiness returned HTTP ${readiness_status:-000}" >&2
  failed=1
fi

exit "$failed"
