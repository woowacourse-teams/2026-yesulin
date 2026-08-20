#!/bin/sh
set -eu

if ! systemctl is-active --quiet yesulin.service; then
  systemctl status yesulin.service --no-pager || true
  journalctl -u yesulin.service -n 50 --no-pager || true
  exit 1
fi

if ! systemctl is-active --quiet nginx.service; then
  systemctl status nginx.service --no-pager || true
  journalctl -u nginx.service -n 50 --no-pager || true
  exit 1
fi

DIRECT_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
  http://127.0.0.1/api/v1/__deployment_smoke__)"
if [ "$DIRECT_STATUS" != "403" ]; then
  echo "Nginx origin guard returned HTTP $DIRECT_STATUS without the secret header" >&2
  exit 1
fi

ORIGIN_SECRET="$(sed -n 's/^YESULIN_CLOUDFRONT_ORIGIN_SECRET=//p' \
  /etc/yesulin/yesulin.env)"
MAX_ATTEMPTS=30
RETRY_INTERVAL_SECONDS=1
ATTEMPT=1

while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  if ! systemctl is-active --quiet yesulin.service; then
    echo "Spring stopped while waiting for readiness" >&2
    systemctl status yesulin.service --no-pager || true
    journalctl -u yesulin.service -n 50 --no-pager || true
    exit 1
  fi

  PROXY_STATUS="$(curl --connect-timeout 1 --max-time 1 \
    -sS -o /dev/null -w '%{http_code}' \
    -H "X-Yesulin-Origin-Secret: $ORIGIN_SECRET" \
    http://127.0.0.1/api/v1/__deployment_smoke__ || true)"
  if [ -z "$PROXY_STATUS" ]; then
    PROXY_STATUS=000
  fi

  case "$PROXY_STATUS" in
    000|500|502|503|504)
      if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
        echo "Spring did not become ready after $MAX_ATTEMPTS attempts; last HTTP status: $PROXY_STATUS" >&2
        systemctl status yesulin.service --no-pager || true
        journalctl -u yesulin.service -n 50 --no-pager || true
        exit 1
      fi

      echo "Spring is not ready yet (attempt $ATTEMPT/$MAX_ATTEMPTS, HTTP $PROXY_STATUS)"
      ATTEMPT=$((ATTEMPT + 1))
      sleep "$RETRY_INTERVAL_SECONDS"
      ;;
    403)
      echo "Nginx rejected the configured origin secret" >&2
      exit 1
      ;;
    *)
      echo "Nginx-to-Spring smoke check succeeded with HTTP $PROXY_STATUS"
      exit 0
      ;;
  esac
done
