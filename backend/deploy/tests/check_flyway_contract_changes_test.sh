#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CHECK_SCRIPT="$TEST_DIRECTORY/../scripts/check_flyway_contract_changes.sh"
TEMP_DIRECTORY="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
}
trap cleanup EXIT

create_repository() {
  repository="$1"
  mkdir -p "$repository/backend/src/main/resources/db/migration"
  git -C "$repository" init --quiet
  git -C "$repository" config user.email "migration-test@example.com"
  git -C "$repository" config user.name "Migration Test"
  printf 'alter table members drop column nickname;\n' \
    > "$repository/backend/src/main/resources/db/migration/V20260825190000__already_released.sql"
  git -C "$repository" add .
  git -C "$repository" commit --quiet -m "test: baseline migrations"
}

expect_failure() {
  name="$1"
  sql="$2"
  expected="$3"
  repository="$TEMP_DIRECTORY/$name"
  create_repository "$repository"
  base="$(git -C "$repository" rev-parse HEAD)"
  printf '%s\n' "$sql" > "$repository/backend/src/main/resources/db/migration/V20260826120000__$name.sql"

  if sh "$CHECK_SCRIPT" "$base" "$repository" > "$TEMP_DIRECTORY/$name.log" 2>&1; then
    cat "$TEMP_DIRECTORY/$name.log" >&2
    echo "Expected $name to fail" >&2
    exit 1
  fi
  if ! grep -q "$expected" "$TEMP_DIRECTORY/$name.log"; then
    cat "$TEMP_DIRECTORY/$name.log" >&2
    echo "Expected $name failure to mention: $expected" >&2
    exit 1
  fi
}

expect_success() {
  name="$1"
  sql="$2"
  repository="$TEMP_DIRECTORY/$name"
  create_repository "$repository"
  base="$(git -C "$repository" rev-parse HEAD)"
  printf '%s\n' "$sql" > "$repository/backend/src/main/resources/db/migration/V20260826120000__$name.sql"

  if ! sh "$CHECK_SCRIPT" "$base" "$repository" > "$TEMP_DIRECTORY/$name.log" 2>&1; then
    cat "$TEMP_DIRECTORY/$name.log" >&2
    echo "Expected $name to pass" >&2
    exit 1
  fi
}

expect_failure drop_column 'ALTER TABLE timetables
    DROP COLUMN self_change_locked;' "컬럼 삭제: drop column self_change_locked"
expect_failure drop_without_column_keyword 'alter table timetables drop `legacy_flag`;' "컬럼 삭제: drop legacy_flag"
expect_failure drop_table 'drop table old_notices;' "테이블 삭제"
expect_failure rename_column 'alter table members rename column user_name to nickname;' "이름 변경"
expect_failure change_column 'alter table members change user_name nickname varchar(30) not null;' "이름 변경"
expect_failure modify_not_null 'alter table members modify column phone varchar(20) not null;' "컬럼 정의 변경"
expect_failure add_required_without_default 'alter table members add column grade varchar(10) not null;' "기본값 없는 필수 컬럼 추가"

expect_success create_table 'create table events (
    id bigint not null auto_increment,
    title varchar(100) not null,
    constraint pk_events primary key (id)
);'
expect_success add_with_default "alter table timetables add column contact_name varchar(30) not null default '';"
expect_success add_nullable 'alter table members add column memo varchar(100);'
expect_success drop_index_and_foreign_key 'alter table members drop index idx_members_email;
alter table members drop foreign key fk_members_team;'
expect_success commented_out '-- alter table members drop column nickname;
create index idx_members_name on members (name);'
expect_success marked_contract '-- contract: 1단계 #123이 2026-10-22 PROD에 배포됨
alter table timetables drop column self_change_locked;'

echo "Flyway contract change tests passed"
