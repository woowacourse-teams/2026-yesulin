#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CHECK_SCRIPT="$TEST_DIRECTORY/../scripts/check_flyway_migration_order.sh"
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
  : > "$repository/backend/src/main/resources/db/migration/V20260825190000__first.sql"
  : > "$repository/backend/src/main/resources/db/migration/V20260825203000__second.sql"
  git -C "$repository" add .
  git -C "$repository" commit --quiet -m "test: baseline migrations"
}

late_repository="$TEMP_DIRECTORY/late"
create_repository "$late_repository"
late_base="$(git -C "$late_repository" rev-parse HEAD)"
: > "$late_repository/backend/src/main/resources/db/migration/V20260825170000__late.sql"

if sh "$CHECK_SCRIPT" "$late_base" "$late_repository" \
  > "$TEMP_DIRECTORY/late.log" 2>&1; then
  echo "Expected a late migration version to fail" >&2
  exit 1
fi
if ! grep -q "must be greater than 20260825203000" "$TEMP_DIRECTORY/late.log"; then
  cat "$TEMP_DIRECTORY/late.log" >&2
  echo "Expected the failure to explain the version requirement" >&2
  exit 1
fi

valid_repository="$TEMP_DIRECTORY/valid"
create_repository "$valid_repository"
valid_base="$(git -C "$valid_repository" rev-parse HEAD)"
: > "$valid_repository/backend/src/main/resources/db/migration/V20260826120000__valid.sql"

sh "$CHECK_SCRIPT" "$valid_base" "$valid_repository"

duplicate_repository="$TEMP_DIRECTORY/duplicate"
create_repository "$duplicate_repository"
duplicate_base="$(git -C "$duplicate_repository" rev-parse HEAD)"
: > "$duplicate_repository/backend/src/main/resources/db/migration/V20260825203000__duplicate.sql"

if sh "$CHECK_SCRIPT" "$duplicate_base" "$duplicate_repository" \
  > "$TEMP_DIRECTORY/duplicate.log" 2>&1; then
  echo "Expected a duplicate migration version to fail" >&2
  exit 1
fi
if ! grep -q "Duplicate Flyway migration version" "$TEMP_DIRECTORY/duplicate.log"; then
  cat "$TEMP_DIRECTORY/duplicate.log" >&2
  echo "Expected the failure to identify the duplicate version" >&2
  exit 1
fi

echo "Flyway migration order tests passed"
