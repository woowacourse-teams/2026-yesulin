#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL_ENV="${1:-$ROOT_DIR/config/server/local.env}"
DEPLOY_ENV="${2:-$ROOT_DIR/config/server/dev.env}"

if [ ! -f "$LOCAL_ENV" ]; then
  printf '%s\n' "로컬 env 파일이 없습니다: $LOCAL_ENV" >&2
  exit 2
fi

if [ ! -f "$DEPLOY_ENV" ] || ! grep -q '^sops_mac=' "$DEPLOY_ENV"; then
  printf '%s\n' "SOPS로 암호화된 배포 env 파일이 없습니다: $DEPLOY_ENV" >&2
  exit 2
fi

LOCAL_KEYS="$(mktemp)"
DEPLOY_KEYS="$(mktemp)"
trap 'rm -f "$LOCAL_KEYS" "$DEPLOY_KEYS"' 0

extract_keys() {
  awk -F= '
    /^[[:space:]]*(#|$)/ { next }
    $1 ~ /^[A-Za-z_][A-Za-z0-9_]*$/ && NF >= 2 {
      if ($1 !~ /^sops_/) {
        if (seen[$1]++) {
          printf "중복된 환경 변수 이름: %s (%s:%d)\n", $1, FILENAME, FNR > "/dev/stderr"
          invalid = 1
        }
        print $1
      }
      next
    }
    {
      printf "잘못된 환경 변수 이름 형식: %s:%d\n", FILENAME, FNR > "/dev/stderr"
      invalid = 1
    }
    END { if (invalid) exit 1 }
  ' "$1" > "$2"
  sort -u "$2" -o "$2"
}

extract_keys "$LOCAL_ENV" "$LOCAL_KEYS"
extract_keys "$DEPLOY_ENV" "$DEPLOY_KEYS"

if cmp -s "$LOCAL_KEYS" "$DEPLOY_KEYS"; then
  printf '%s\n' '로컬과 배포 환경의 변수 이름이 모두 같습니다.'
  exit 0
fi

printf '%s\n' '로컬에만 있는 변수 이름:'
comm -23 "$LOCAL_KEYS" "$DEPLOY_KEYS"
printf '%s\n' '배포 환경에만 있는 변수 이름:'
comm -13 "$LOCAL_KEYS" "$DEPLOY_KEYS"
printf '%s\n' '값은 비교하거나 출력하지 않았습니다. 환경별로 의도한 차이인지 확인하세요.'
exit 1
