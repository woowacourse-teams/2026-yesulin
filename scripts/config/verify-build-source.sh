#!/bin/sh
set -eu

APP_DIR="${CODEBUILD_SRC_DIR:?프로젝트 소스가 없습니다}"
CONFIG_DIR="${CODEBUILD_SRC_DIR_ConfigSource:?config 소스가 없습니다}"
CONFIG_SHA="$(printf '%s' "${CONFIG_COMMIT_ID:?config 커밋 ID가 없습니다}" | tr '[:upper:]' '[:lower:]')"
DEPLOY_ENV="${DEPLOY_ENV:-}"

case "$DEPLOY_ENV" in
  dev | prod) ;;
  *) echo 'DEPLOY_ENV는 dev 또는 prod여야 합니다.' >&2; exit 1 ;;
esac

PINNED_SHA="$(tr -d '[:space:]' < "$APP_DIR/config-version.txt" | tr '[:upper:]' '[:lower:]')"
ENV_FILE="$CONFIG_DIR/server/$DEPLOY_ENV.env"

if [ "$PINNED_SHA" != "$CONFIG_SHA" ]; then
  echo "config-version.txt와 CodePipeline이 가져온 config 커밋이 다릅니다." >&2
  exit 1
fi

if [ ! -s "$ENV_FILE" ] || ! grep -q '^sops_mac=' "$ENV_FILE"; then
  echo "암호화된 $DEPLOY_ENV.env가 없거나 SOPS 형식이 아닙니다." >&2
  exit 1
fi

echo "config 버전과 암호화 파일을 확인했습니다: $CONFIG_SHA"
