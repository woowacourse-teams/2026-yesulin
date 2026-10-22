#!/bin/sh
set -eu

# PROD는 한 대씩 배포하므로 배포 중 옛 버전과 새 버전이 같은 DB를 함께 쓰고, 롤백해도 Flyway는 되돌리지 않는다.
# 새 마이그레이션에 옛 코드를 깨는 변경(Expand-Contract의 Contract 단계)이 있으면 실패시킨다.
# 코드에서 사용을 없앤 버전이 PROD에 배포된 뒤라면 파일에 "-- contract: <사유>" 주석을 넣어 통과시킨다.

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 BASE_REF [REPOSITORY_ROOT]" >&2
  exit 2
fi

base_ref="$1"
repository_root="${2:-$(git rev-parse --show-toplevel)}"
migration_directory="backend/src/main/resources/db/migration"

cd "$repository_root"

if ! git rev-parse --verify "$base_ref^{commit}" >/dev/null 2>&1; then
  echo "Base ref does not resolve to a commit: $base_ref" >&2
  exit 2
fi

# 주석을 지우고 문장(;) 단위 한 줄, 소문자, 공백 하나로 만든다.
normalized_statements() {
  sed 's/--.*$//' "$1" \
    | tr '\n\t' '  ' \
    | tr ';' '\n' \
    | tr -s ' ' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/`//g; s/^ //; s/ $//'
}

contract_changes() {
  normalized_statements "$1" | while IFS= read -r statement; do
    case "$statement" in
      "drop table"*) echo "테이블 삭제: $statement" ;;
      "truncate"*) echo "데이터 전체 삭제: $statement" ;;
      "rename table"*) echo "테이블 이름 변경: $statement" ;;
      "alter table"*)
        printf '%s\n' "$statement" \
          | grep -oE ' drop( column)? [a-z0-9_]+' \
          | grep -vE ' drop (index|key|foreign|constraint|primary|check|default)$' \
          | sed "s/^ /컬럼 삭제: /; s/\$/ ($statement)/" || true
        if printf '%s\n' "$statement" | grep -qE ' rename (column |to |as )| change( column)? '; then
          echo "이름 변경: $statement"
        fi
        if printf '%s\n' "$statement" | grep -qE ' modify( column)? .* not null'; then
          echo "컬럼 정의 변경(NOT NULL·타입·길이): $statement"
        fi
        if printf '%s\n' "$statement" | grep -qE ' add( column)? .* not null' \
          && ! printf '%s\n' "$statement" | grep -qE ' default | auto_increment'; then
          echo "기본값 없는 필수 컬럼 추가: $statement"
        fi
        ;;
    esac
  done
}

found=0
for path in $(find "$migration_directory" -maxdepth 1 -type f -name 'V*__*.sql' -print | sort); do
  relative_path="${path#./}"
  if git cat-file -e "$base_ref:$relative_path" 2>/dev/null; then
    continue
  fi

  changes="$(contract_changes "$relative_path")"
  if [ -z "$changes" ]; then
    continue
  fi

  reason="$(sed -n 's/^[[:space:]]*--[[:space:]]*contract:[[:space:]]*//p' "$relative_path" | head -n 1)"
  if [ -n "$reason" ]; then
    printf '%s: 옛 코드를 깨는 변경이 있지만 contract 표시가 있어 통과한다 (%s)\n' "$relative_path" "$reason"
    continue
  fi

  found=1
  printf '%s: 옛 코드를 깨는 DB 변경이 있다\n' "$relative_path" >&2
  printf '%s\n' "$changes" | sed 's/^/  - /' >&2
done

if [ "$found" -eq 1 ]; then
  cat >&2 <<'EOF'

PROD는 한 대씩 배포하므로 배포 중 옛 버전 서버가 이 DB를 함께 쓰고, 롤백해도 DB는 되돌아가지 않는다.
Expand-Contract로 나눠서 배포한다.
  1. 먼저 코드에서 그 컬럼·테이블 사용을 없애거나, 새 컬럼에 default를 준 PR을 PROD까지 배포한다.
  2. 그 버전이 PROD에 나간 뒤 삭제·변경 마이그레이션을 별도 PR로 올리고, 파일에 사유를 적는다.
     예: -- contract: 1단계 #123이 2026-10-22 PROD에 배포됨
자세한 내용은 backend/docs/operations/deployment.md의 DB 변경 규칙을 본다.
EOF
  exit 1
fi

echo "New Flyway migrations keep the schema compatible with the previous release"
