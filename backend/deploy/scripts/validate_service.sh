#!/bin/sh
set -eu

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:80/actuator/health/readiness}"

if ! systemctl is-active --quiet yesulin.service; then
  systemctl status yesulin.service --no-pager || true
  journalctl -u yesulin.service -n 50 --no-pager || true
  exit 1
fi

READINESS_TIMEOUT_SECONDS=420
RETRY_INTERVAL_SECONDS=2
STARTED_AT="$(date +%s)"

while true; do
  if ! systemctl is-active --quiet yesulin.service; then
    echo "Spring stopped while waiting for readiness" >&2
    systemctl status yesulin.service --no-pager || true
    journalctl -u yesulin.service -n 50 --no-pager || true
    exit 1
  fi

  if ! READINESS_STATUS="$(curl --connect-timeout 1 --max-time 2 -sS \
    -o /dev/null -w '%{http_code}' "$HEALTH_URL")"; then
    READINESS_STATUS=000
  fi

  case "$READINESS_STATUS" in
    000|500|502|503|504)
      ELAPSED_SECONDS="$(($(date +%s) - STARTED_AT))"
      if [ "$ELAPSED_SECONDS" -ge "$READINESS_TIMEOUT_SECONDS" ]; then
        systemctl status yesulin.service --no-pager || true
        journalctl -u yesulin.service -n 15 --no-pager || true
        echo "Spring did not become ready after ${ELAPSED_SECONDS}s; last HTTP status: $READINESS_STATUS" >&2
        exit 1
      fi

      echo "Spring is not ready yet (${ELAPSED_SECONDS}s/${READINESS_TIMEOUT_SECONDS}s, HTTP $READINESS_STATUS)"
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
