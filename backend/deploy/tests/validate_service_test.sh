#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
VALIDATE_SCRIPT="$TEST_DIRECTORY/../scripts/validate_service.sh"
APPSPEC_FILE="$TEST_DIRECTORY/../appspec.yml"
TEMP_DIRECTORY="$(mktemp -d)"
FAKE_BIN="$TEMP_DIRECTORY/bin"

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/systemctl" <<'EOF'
#!/bin/sh
exit 0
EOF

cat > "$FAKE_BIN/journalctl" <<'EOF'
#!/bin/sh
exit 0
EOF

cat > "$FAKE_BIN/sleep" <<'EOF'
#!/bin/sh
exit 0
EOF

cat > "$FAKE_BIN/date" <<'EOF'
#!/bin/sh
# Each simulated request advances the clock by two seconds.
printf '%s\n' "$(($(cat "$TEST_STATE_FILE") * 2))"
EOF

cat > "$FAKE_BIN/curl" <<'EOF'
#!/bin/sh
call_count="$(cat "$TEST_STATE_FILE")"
call_count=$((call_count + 1))
printf '%s\n' "$call_count" > "$TEST_STATE_FILE"

if [ "$TEST_SCENARIO" = "cold_start" ] && [ "$call_count" -ge 125 ]; then
  printf '200'
elif [ "$TEST_SCENARIO" = "unexpected" ]; then
  printf '418'
else
  printf '503'
fi
EOF

chmod +x "$FAKE_BIN/systemctl" "$FAKE_BIN/journalctl" \
  "$FAKE_BIN/sleep" "$FAKE_BIN/date" "$FAKE_BIN/curl"

run_validation() {
  scenario="$1"
  state_file="$TEMP_DIRECTORY/$scenario-count"
  printf '0\n' > "$state_file"

  TEST_SCENARIO="$scenario" \
  TEST_STATE_FILE="$state_file" \
  PATH="$FAKE_BIN:$PATH" \
    sh "$VALIDATE_SCRIPT"
}

if ! run_validation cold_start > "$TEMP_DIRECTORY/cold-start.log" 2>&1; then
  cat "$TEMP_DIRECTORY/cold-start.log" >&2
  echo "Expected validation to wait for a slow cold start" >&2
  exit 1
fi

if run_validation stays_unavailable \
  > "$TEMP_DIRECTORY/stays-unavailable.log" 2>&1; then
  cat "$TEMP_DIRECTORY/stays-unavailable.log" >&2
  echo "Expected validation to fail when Spring stays unavailable" >&2
  exit 1
fi

STAYS_UNAVAILABLE_ATTEMPTS="$(cat "$TEMP_DIRECTORY/stays_unavailable-count")"
if [ "$STAYS_UNAVAILABLE_ATTEMPTS" -ne 210 ]; then
  echo "Expected validation to stop after 420 seconds, got $STAYS_UNAVAILABLE_ATTEMPTS simulated requests" >&2
  exit 1
fi

VALIDATE_TIMEOUT="$(awk '
  $1 == "ValidateService:" { in_validate_service = 1; next }
  in_validate_service && $1 == "timeout:" { print $2; exit }
' "$APPSPEC_FILE")"
if [ "$VALIDATE_TIMEOUT" -ne 450 ]; then
  echo "Expected ValidateService timeout 450, got $VALIDATE_TIMEOUT" >&2
  exit 1
fi

if run_validation unexpected \
  > "$TEMP_DIRECTORY/unexpected.log" 2>&1; then
  cat "$TEMP_DIRECTORY/unexpected.log" >&2
  echo "Expected validation to reject an unexpected status" >&2
  exit 1
fi

echo "ValidateService readiness tests passed"
