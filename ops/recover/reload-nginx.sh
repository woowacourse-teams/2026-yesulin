#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/recover/reload-nginx.sh" >&2
  exit 1
fi

nginx -t
systemctl reload nginx.service
systemctl is-active --quiet nginx.service

status="$(curl --connect-timeout 1 --max-time 2 -sS -o /dev/null -w '%{http_code}' \
  http://127.0.0.1/api/v1/__deployment_smoke__ || true)"
if [ "$status" != "403" ]; then
  echo "Origin guard check failed with HTTP ${status:-000}" >&2
  exit 1
fi

echo "nginx.service reloaded; direct request is blocked with HTTP 403"
