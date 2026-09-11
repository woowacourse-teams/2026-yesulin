#!/bin/sh
set -eu

MODE="${1:---local}"
CONFIG_PATH="config"
VERSION_FILE="config-version.txt"
CONFIG_BRANCH="main"

fail() {
  printf '%s\n' "config 버전 검증 실패: $1" >&2
  exit 1
}

case "$MODE" in
  --index-only | --local | --remote)
    ;;
  *)
    fail "알 수 없는 검증 모드입니다 - $MODE"
    ;;
esac

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

GITLINK_SHA="$(
  git ls-files --stage -- "$CONFIG_PATH" |
    awk '$1 == "160000" { print $2; exit }'
)"

if [ -z "$GITLINK_SHA" ]; then
  fail "$CONFIG_PATH 경로가 submodule로 등록되지 않았습니다."
fi

PINNED_SHA="$(
  git show ":$VERSION_FILE" 2>/dev/null |
    tr -d '[:space:]' |
    tr '[:upper:]' '[:lower:]'
)" || true

if ! printf '%s\n' "$PINNED_SHA" |
  grep -Eq '^([0-9a-f]{40}|[0-9a-f]{64})$'; then
  fail "$VERSION_FILE 파일에는 Git 커밋 SHA 하나만 있어야 합니다."
fi

if [ "$GITLINK_SHA" != "$PINNED_SHA" ]; then
  fail "stage된 submodule SHA와 $VERSION_FILE 값이 일치하지 않습니다."
fi

if [ "$MODE" = "--index-only" ]; then
  printf '%s\n' "config 버전이 올바릅니다: $PINNED_SHA"
  exit 0
fi

if ! git diff --quiet -- "$VERSION_FILE"; then
  fail "$VERSION_FILE 파일에 stage되지 않은 변경 사항이 있습니다."
fi

if [ ! -e "$CONFIG_PATH/.git" ]; then
  HEAD_GITLINK_SHA="$(
    git rev-parse "HEAD:$CONFIG_PATH" 2>/dev/null || true
  )"

  if [ "$GITLINK_SHA" != "$HEAD_GITLINK_SHA" ]; then
    fail "submodule을 초기화하지 않은 상태에서 config 포인터가 변경되었습니다."
  fi

  printf '%s\n' "submodule이 초기화되지 않아 작업 디렉터리 검증을 건너뜁니다."

  exit 0
fi

WORKTREE_SHA="$(
  git -C "$CONFIG_PATH" rev-parse HEAD |
    tr '[:upper:]' '[:lower:]'
)"

if [ "$WORKTREE_SHA" != "$GITLINK_SHA" ]; then
  fail "config HEAD와 stage된 submodule SHA가 일치하지 않습니다."
fi

if [ -n "$(git -C "$CONFIG_PATH" status --porcelain)" ]; then
  fail "config 저장소에 커밋되지 않은 변경 사항이 있습니다."
fi

HEAD_GITLINK_SHA="$(
  git rev-parse "HEAD:$CONFIG_PATH" 2>/dev/null || true
)"

if [ "$GITLINK_SHA" != "$HEAD_GITLINK_SHA" ]; then
  CURRENT_BRANCH="$(
    git -C "$CONFIG_PATH" \
      symbolic-ref --quiet --short HEAD 2>/dev/null || true
  )"

  if [ "$CURRENT_BRANCH" != "$CONFIG_BRANCH" ]; then
    fail "config 포인터는 $CONFIG_BRANCH 브랜치의 커밋으로만 갱신할 수 있습니다."
  fi
fi

if [ "$MODE" = "--remote" ]; then
  printf '%s\n' "config 커밋이 origin/${CONFIG_BRANCH}에 push되었는지 확인합니다..."

  git -C "$CONFIG_PATH" fetch --quiet origin "$CONFIG_BRANCH"

  if ! git -C "$CONFIG_PATH" merge-base \
    --is-ancestor "$WORKTREE_SHA" "origin/$CONFIG_BRANCH"; then
    fail "config 커밋이 origin/${CONFIG_BRANCH}에 push되지 않았습니다."
  fi
fi

printf '%s\n' "config 버전이 올바릅니다: $PINNED_SHA"