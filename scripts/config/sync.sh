#!/bin/sh
set -eu

CONFIG_PATH="config"
VERSION_FILE="config-version.txt"
CONFIG_BRANCH="main"
ORIGIN_BRANCH="main"
COMMIT_MESSAGE="${1:-}"

fail() {
  printf '%s\n' "[KO] config 동기화에 실패했습니다: $1" >&2
  exit 1
}

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if [ ! -e "$CONFIG_PATH/.git" ]; then
  fail "config submodule이 초기화되지 않았습니다."
fi

CURRENT_BRANCH="$(
  git -C "$CONFIG_PATH" symbolic-ref --quiet --short HEAD 2>/dev/null || true
)"

if [ "$CURRENT_BRANCH" != "$CONFIG_BRANCH" ]; then
  fail "config 저장소가 $CONFIG_BRANCH 브랜치에 있어야 합니다."
fi

CONFIG_CHANGES="$(git -C "$CONFIG_PATH" status --porcelain)"

if [ -n "$CONFIG_CHANGES" ]; then
  if [ -z "$COMMIT_MESSAGE" ]; then
    fail "config 변경 사항이 있으면 커밋 메시지가 필요합니다."
  fi

  printf '%s\n' "config 변경 사항을 커밋합니다..."

  git -C "$CONFIG_PATH" add -A
  git -C "$CONFIG_PATH" commit -m "$COMMIT_MESSAGE"
else
  printf '%s\n' "커밋되지 않은 config 변경 사항이 없습니다."
fi

printf '%s\n' "config를 origin/${ORIGIN_BRANCH}과 동기화합니다..."

git -C "$CONFIG_PATH" pull --rebase origin "$ORIGIN_BRANCH"
git -C "$CONFIG_PATH" push origin "$ORIGIN_BRANCH"

CONFIG_SHA="$(git -C "$CONFIG_PATH" rev-parse HEAD)"

printf '%s\n' "$CONFIG_SHA" >"$VERSION_FILE"

git add "$CONFIG_PATH" "$VERSION_FILE"

sh scripts/config/validate-pin.sh --local

printf '%s\n' "config 동기화가 완료되었습니다: $CONFIG_SHA"