#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
INSTALL_SCRIPT="$TEST_DIRECTORY/../scripts/install_env.sh"
SERVICE_FILE="$TEST_DIRECTORY/../systemd/yesulin.service"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

mkdir -p "$TEST_ROOT/bin" "$TEST_ROOT/releases/1111111" "$TEST_ROOT/releases/2222222"
printf '%s\n' '#!/bin/sh' 'set -eu' \
  'if [ "$1" != decrypt ]; then exit 1; fi' \
  'if grep -q "^FAIL$" "$2"; then exit 1; fi' \
  'sed -n "s/^ciphertext=//p" "$2"' > "$TEST_ROOT/bin/sops"
printf '%s\n' '#!/bin/sh' 'exit 0' > "$TEST_ROOT/bin/chown"
chmod +x "$TEST_ROOT/bin/sops" "$TEST_ROOT/bin/chown"

printf 'test-key\n' > "$TEST_ROOT/key.txt"
printf 'VERSION=blue\n' > "$TEST_ROOT/releases/1111111/yesulin.env"
printf 'ciphertext=VERSION=green\n' > "$TEST_ROOT/staging.env"

PATH="$TEST_ROOT/bin:$PATH" sh "$INSTALL_SCRIPT" \
  "$TEST_ROOT/staging.env" "$TEST_ROOT/key.txt" "$TEST_ROOT/releases/2222222"

grep -Fxq 'VERSION=blue' "$TEST_ROOT/releases/1111111/yesulin.env"
grep -Fxq 'VERSION=green' "$TEST_ROOT/releases/2222222/yesulin.env"
grep -Fxq 'EnvironmentFile=/opt/yesulin/current/yesulin.env' "$SERVICE_FILE"

ln -s "$TEST_ROOT/releases/2222222" "$TEST_ROOT/current"
grep -Fxq 'VERSION=green' "$TEST_ROOT/current/yesulin.env"
ln -sfn "$TEST_ROOT/releases/1111111" "$TEST_ROOT/current"
grep -Fxq 'VERSION=blue' "$TEST_ROOT/current/yesulin.env"

printf 'FAIL\n' > "$TEST_ROOT/staging.env"
if PATH="$TEST_ROOT/bin:$PATH" sh "$INSTALL_SCRIPT" \
  "$TEST_ROOT/staging.env" "$TEST_ROOT/key.txt" "$TEST_ROOT/releases/2222222"; then
  echo 'Decryption failure unexpectedly succeeded' >&2
  exit 1
fi
grep -Fxq 'VERSION=green' "$TEST_ROOT/releases/2222222/yesulin.env"

echo 'Release environment rollback tests passed'
