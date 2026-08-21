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

for service in yesulin.service nginx.service codedeploy-agent.service \
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

origin_secret="$(sed -n 's/^YESULIN_CLOUDFRONT_ORIGIN_SECRET=//p' \
  /etc/yesulin/yesulin.env)"
if [ -r /etc/letsencrypt/live/origin.yesulin.art/fullchain.pem ]; then
  origin_url=https://origin.yesulin.art/api/v1/__deployment_smoke__
  resolve_option='--resolve origin.yesulin.art:443:127.0.0.1'
else
  origin_url=http://127.0.0.1/api/v1/__deployment_smoke__
  resolve_option=''
fi

# Word splitting is intentional for the optional curl --resolve pair.
# shellcheck disable=SC2086
direct_status="$(curl -sS -o /dev/null -w '%{http_code}' $resolve_option "$origin_url" || true)"
# shellcheck disable=SC2086
proxy_status="$(curl -sS -o /dev/null -w '%{http_code}' $resolve_option \
  -H "X-Yesulin-Origin-Secret: $origin_secret" "$origin_url" || true)"

if [ "$direct_status" = 403 ]; then
  echo "OK origin guard rejects requests without the secret"
else
  echo "FAIL origin guard returned HTTP ${direct_status:-000}" >&2
  failed=1
fi
if [ "$proxy_status" = 404 ]; then
  echo "OK Nginx-to-Spring smoke check"
else
  echo "FAIL Nginx-to-Spring returned HTTP ${proxy_status:-000}" >&2
  failed=1
fi

exit "$failed"
