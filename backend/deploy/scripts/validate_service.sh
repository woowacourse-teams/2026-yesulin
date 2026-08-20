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
PROXY_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "X-Yesulin-Origin-Secret: $ORIGIN_SECRET" \
  http://127.0.0.1/api/v1/__deployment_smoke__)"

case "$PROXY_STATUS" in
  000|403|500|502|503|504)
    echo "Nginx-to-Spring smoke check returned HTTP $PROXY_STATUS" >&2
    exit 1
    ;;
esac
