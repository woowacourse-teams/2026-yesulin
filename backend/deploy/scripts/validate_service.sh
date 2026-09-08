#!/bin/sh
set -eu

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:80/actuator/health/readiness}"

if ! systemctl is-active --quiet yesulin.service; then
  systemctl status yesulin.service --no-pager || true
  journalctl -u yesulin.service -n 50 --no-pager || true
  exit 1
fi

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

  READINESS_STATUS="$(curl --connect-timeout 1 --max-time 2 -sS \
    -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [ -z "$READINESS_STATUS" ]; then
    READINESS_STATUS=000
  fi

  case "$READINESS_STATUS" in
    000|500|502|503|504)
      if [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
        echo "Spring did not become ready after $MAX_ATTEMPTS attempts; last HTTP status: $READINESS_STATUS" >&2
        systemctl status yesulin.service --no-pager || true
        journalctl -u yesulin.service -n 50 --no-pager || true
        exit 1
      fi

      echo "Spring is not ready yet (attempt $ATTEMPT/$MAX_ATTEMPTS, HTTP $READINESS_STATUS)"
      ATTEMPT=$((ATTEMPT + 1))
      sleep "$RETRY_INTERVAL_SECONDS"
      ;;
    200)
      echo "Spring readiness check succeeded with HTTP $READINESS_STATUS"
      exit 0
      ;;
    *)
      echo "Unexpected Spring readiness status: HTTP $READINESS_STATUS" >&2
      exit 1
      ;;
  esac
done
