#!/bin/sh
set -eu

ORIGIN_HOST="${ORIGIN_HOST:-origin.yesulin.art}"

request_status() {
  request_secret="${1:-}"
  if [ -r "/etc/letsencrypt/live/$ORIGIN_HOST/fullchain.pem" ]; then
    set -- curl --connect-timeout 1 --max-time 1 -sS -o /dev/null -w '%{http_code}' \
      --resolve "$ORIGIN_HOST:443:127.0.0.1"
    request_url="https://$ORIGIN_HOST/api/v1/__deployment_smoke__"
  else
    set -- curl --connect-timeout 1 --max-time 1 -sS -o /dev/null -w '%{http_code}'
    request_url="http://127.0.0.1/api/v1/__deployment_smoke__"
  fi
  if [ -n "$request_secret" ]; then
    set -- "$@" -H "X-Yesulin-Origin-Secret: $request_secret"
  fi
  "$@" "$request_url"
}

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

DIRECT_STATUS="$(request_status)"
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

  PROXY_STATUS="$(request_status "$ORIGIN_SECRET" || true)"
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
    404)
      echo "Nginx-to-Spring smoke check succeeded with HTTP $PROXY_STATUS"
      exit 0
      ;;
    403)
      echo "Nginx rejected the configured origin secret" >&2
      exit 1
      ;;
    *)
      echo "Unexpected Nginx-to-Spring smoke status: HTTP $PROXY_STATUS" >&2
      exit 1
      ;;
  esac
done
