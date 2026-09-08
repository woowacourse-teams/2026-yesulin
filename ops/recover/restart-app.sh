#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/recover/restart-app.sh" >&2
  exit 1
fi

environment_file=/etc/yesulin/yesulin.env
if [ ! -r "$environment_file" ]; then
  echo "$environment_file is missing or unreadable" >&2
  exit 1
fi

echo "Restarting yesulin.service"
systemctl restart yesulin.service

attempt=1
status=000
while [ "$attempt" -le 30 ]; do
  if systemctl is-active --quiet yesulin.service; then
    status="$(curl --connect-timeout 1 --max-time 2 -sS -o /dev/null -w '%{http_code}' \
      http://127.0.0.1:80/actuator/health/readiness || true)"
    if [ "$status" = "200" ]; then
      break
    fi
  fi
  sleep 1
  attempt=$((attempt + 1))
done

if [ "$status" != "200" ]; then
  echo "Application readiness check failed with HTTP ${status:-000}" >&2
  systemctl status yesulin.service --no-pager || true
  journalctl -u yesulin.service -n 100 --no-pager || true
  exit 1
fi

echo "yesulin.service is active and ready; HTTP $status"
echo "release=$(readlink -f /opt/yesulin/current)"
