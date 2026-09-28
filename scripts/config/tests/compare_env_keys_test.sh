#!/bin/sh
set -eu

TEST_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
mkdir -p "$TEST_ROOT/app/scripts/config" "$TEST_ROOT/app/config/server"
cp "$TEST_DIR/../compare-env-keys.sh" "$TEST_ROOT/app/scripts/config/"
SCRIPT="$TEST_ROOT/app/scripts/config/compare-env-keys.sh"
ENV_DIR="$TEST_ROOT/app/config/server"
printf '%s\n' 'COMMON=local-secret-must-not-print' > "$ENV_DIR/local.env"
printf '%s\n' 'COMMON=ENC[dev-secret-must-not-print]' 'sops_mac=fixture' > "$ENV_DIR/dev.env"
printf '%s\n' 'COMMON=ENC[prod-secret-must-not-print]' 'sops_mac=fixture' > "$ENV_DIR/prod.env"

# 기본 대상은 DEV이며, 키가 없어도 이름만 비교할 수 있다.
sh "$SCRIPT" > "$TEST_ROOT/output" 2>&1
sh "$SCRIPT" "$ENV_DIR/local.env" "$ENV_DIR/prod.env" > "$TEST_ROOT/output" 2>&1

expect_failure() {
  expected="$1"
  shift
  result=0
  sh "$SCRIPT" "$@" > "$TEST_ROOT/output" 2>&1 || result="$?"
  test "$result" -eq "$expected"
  if grep -q 'secret-must-not-print' "$TEST_ROOT/output"; then
    echo 'Environment value leaked into output' >&2
    exit 1
  fi
}

# 차이가 있는 이름만 출력하며, 값은 출력하지 않는다.
printf '%s\n' 'PROD_ONLY=ENC[prod-secret-must-not-print]' >> "$ENV_DIR/prod.env"
expect_failure 1 "$ENV_DIR/local.env" "$ENV_DIR/prod.env"
grep -Fxq 'PROD_ONLY' "$TEST_ROOT/output"

printf '%s\n' 'COMMON=duplicate-secret-must-not-print' >> "$ENV_DIR/local.env"
expect_failure 1
printf '%s\n' 'bad key=invalid-secret-must-not-print' > "$ENV_DIR/local.env"
expect_failure 1
printf '%s\n' 'COMMON=local-secret-must-not-print' > "$ENV_DIR/local.env"
printf '%s\n' 'COMMON=plain-secret-must-not-print' > "$ENV_DIR/prod.env"
expect_failure 2 "$ENV_DIR/local.env" "$ENV_DIR/prod.env"
expect_failure 2 "$ENV_DIR/missing.env"
expect_failure 2 "$ENV_DIR/local.env" "$ENV_DIR/missing.env"

echo 'Environment key comparison tests passed'
