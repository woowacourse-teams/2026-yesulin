#!/bin/sh
set -eu

SOURCE=/opt/yesulin/deployment/config/staging.env
TARGET=/etc/yesulin/yesulin.env
KEY_FILE=/etc/yesulin/sops/age/keys.txt

if [ ! -s "$SOURCE" ] || [ ! -s "$KEY_FILE" ]; then
  echo "암호화된 환경 파일 또는 EC2 age 키가 없습니다." >&2
  exit 1
fi

if ! command -v sops >/dev/null 2>&1; then
  echo "EC2에 sops가 설치되지 않았습니다." >&2
  exit 1
fi

TMP_FILE="$(mktemp /etc/yesulin/.yesulin.env.XXXXXX)"
trap 'rm -f "$TMP_FILE"' 0

SOPS_AGE_KEY_FILE="$KEY_FILE" sops decrypt "$SOURCE" > "$TMP_FILE"
chown root:yesulin "$TMP_FILE"
chmod 0640 "$TMP_FILE"
mv -f "$TMP_FILE" "$TARGET"

echo "EC2 환경 파일을 설치했습니다."
