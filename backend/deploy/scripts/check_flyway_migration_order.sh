#!/bin/sh
set -eu

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

current_versions="$({
  find "$migration_directory" -maxdepth 1 -type f -name 'V*__*.sql' -print
} | while IFS= read -r path; do
  basename "$path" | sed -n 's/^V\([0-9]\{14\}\)__.*\.sql$/\1/p'
done)"

duplicate_versions="$(printf '%s\n' "$current_versions" \
  | sed '/^$/d' \
  | sort \
  | uniq -d)"

if [ -n "$duplicate_versions" ]; then
  printf 'Duplicate Flyway migration version: %s\n' "$duplicate_versions" >&2
  exit 1
fi

base_max_version="$(git ls-tree -r --name-only "$base_ref" -- "$migration_directory" \
  | sed -n 's#^.*/V\([0-9]\{14\}\)__.*\.sql$#\1#p' \
  | sort \
  | tail -n 1)"

if [ -z "$base_max_version" ]; then
  echo "No versioned Flyway migrations exist in $base_ref"
  exit 0
fi

find "$migration_directory" -maxdepth 1 -type f -name 'V*__*.sql' -print \
  | sort \
  | while IFS= read -r path; do
      relative_path="${path#./}"
      if git cat-file -e "$base_ref:$relative_path" 2>/dev/null; then
        continue
      fi

      filename="$(basename "$relative_path")"
      version="$(printf '%s\n' "$filename" \
        | sed -n 's/^V\([0-9]\{14\}\)__.*\.sql$/\1/p')"

      if [ -z "$version" ]; then
        echo "Invalid Flyway migration filename: $relative_path" >&2
        exit 1
      fi

      if [ "$version" -le "$base_max_version" ]; then
        echo "New Flyway migration $filename has version $version; it must be greater than $base_max_version from $base_ref" >&2
        exit 1
      fi
    done

echo "Flyway migration versions are unique and newer than $base_max_version"
