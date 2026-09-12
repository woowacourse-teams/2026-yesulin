#!/bin/sh
set -eu

SOURCE="${1:?암호화된 환경 파일 경로가 필요합니다.}"
KEY_FILE="${2:?EC2 age 키 경로가 필요합니다.}"
RELEASE_DIR="${3:?릴리스 디렉터리 경로가 필요합니다.}"
TARGET="$RELEASE_DIR/yesulin.env"

if [ ! -s "$SOURCE" ] || [ ! -s "$KEY_FILE" ] || [ ! -d "$RELEASE_DIR" ]; then
  echo "암호화된 환경 파일, EC2 age 키 또는 릴리스 디렉터리가 없습니다." >&2
  exit 1
fi

if ! command -v sops >/dev/null 2>&1; then
  echo "EC2에 sops가 설치되지 않았습니다." >&2
  exit 1
fi

TMP_FILE="$(mktemp "$RELEASE_DIR/.yesulin.env.XXXXXX")"
trap 'rm -f "$TMP_FILE"' 0

SOPS_AGE_KEY_FILE="$KEY_FILE" sops decrypt "$SOURCE" > "$TMP_FILE"
chown root:yesulin "$TMP_FILE"
chmod 0640 "$TMP_FILE"
mv -f "$TMP_FILE" "$TARGET"

echo "릴리스 환경 파일을 설치했습니다."
