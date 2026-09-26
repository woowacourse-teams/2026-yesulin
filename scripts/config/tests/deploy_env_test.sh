#!/bin/sh
set -eu

TEST_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$TEST_DIR/../../.." && pwd)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

APP_DIR="$TEST_ROOT/app"
CONFIG_DIR="$TEST_ROOT/config"
BACKEND_DIR="$TEST_ROOT/backend"
REVISION=1234567890abcdef1234567890abcdef12345678
mkdir -p "$APP_DIR" "$CONFIG_DIR/server" "$BACKEND_DIR/build/libs"
printf '%s\n' "$REVISION" > "$APP_DIR/config-version.txt"
printf '%s\n' 'environment=dev' 'sops_mac=dev-test' > "$CONFIG_DIR/server/dev.env"
printf '%s\n' 'environment=prod' 'sops_mac=prod-test' > "$CONFIG_DIR/server/prod.env"
printf '%s\n' 'dummy jar' > "$BACKEND_DIR/build/libs/application.jar"
printf '%s\n' 'dummy build' > "$BACKEND_DIR/build.gradle.kts"
cp -R "$ROOT_DIR/backend/deploy" "$BACKEND_DIR/deploy"

verify() {
  CODEBUILD_SRC_DIR="$APP_DIR" \
    CODEBUILD_SRC_DIR_ConfigSource="$CONFIG_DIR" \
    CONFIG_COMMIT_ID="$REVISION" \
    DEPLOY_ENV="$1" \
    sh "$ROOT_DIR/scripts/config/verify-build-source.sh" > "$TEST_ROOT/verify.log" 2>&1
}

package() (
  cd "$BACKEND_DIR"
  DEPLOY_ENV="$1" sh deploy/package_bundle.sh "$REVISION" "$CONFIG_DIR" > "$TEST_ROOT/package.log" 2>&1
)

# Given: 두 암호화 파일과 일치하는 config SHA.
# When: DEV와 PROD를 각각 선택한다.
# Then: 검증과 패키징이 각 환경의 암호문만 선택한다.
for environment in dev prod; do
  verify "$environment"
  package "$environment"
  cmp "$CONFIG_DIR/server/$environment.env" "$BACKEND_DIR/build/deployment/config/runtime.env"
  test "$(find "$BACKEND_DIR/build/deployment/config" -type f | wc -l | tr -d ' ')" -eq 1
  grep -Fq '"$DEPLOYMENT_DIR/config/runtime.env"' \
    "$BACKEND_DIR/build/deployment/scripts/after_install.sh"
done

# Given: 환경 선택값이 없거나 허용되지 않는다.
# When: 검증 또는 패키징을 시도한다.
# Then: 두 경계 모두 거부한다.
for environment in '' staging typo; do
  if verify "$environment"; then
    echo 'Invalid deploy environment passed verification' >&2
    exit 1
  fi
  if package "$environment"; then
    echo 'Invalid deploy environment was packaged' >&2
    exit 1
  fi
done

# Given: PROD 암호문이 없거나 SOPS 형식이 아니다.
# When: PROD 배포를 검증한다.
# Then: 실패한다.
mv "$CONFIG_DIR/server/prod.env" "$TEST_ROOT/prod.env"
if verify prod; then
  echo 'Missing encrypted file passed verification' >&2
  exit 1
fi
mv "$TEST_ROOT/prod.env" "$CONFIG_DIR/server/prod.env"
printf '%s\n' 'not-sops' > "$CONFIG_DIR/server/prod.env"
if verify prod; then
  echo 'Non-SOPS file passed verification' >&2
  exit 1
fi

# Given: 고정된 config SHA와 실제 소스 SHA가 다르다.
# When: DEV 배포를 검증한다.
# Then: 실패한다.
printf '%s\n' 'ffffffffffffffffffffffffffffffffffffffff' > "$APP_DIR/config-version.txt"
if verify dev; then
  echo 'Mismatched config revision passed verification' >&2
  exit 1
fi

echo 'Deploy environment selection tests passed'
