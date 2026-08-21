#!/bin/sh
set -eu

RELEASE_ROOT="${RELEASE_ROOT:-/opt/yesulin/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/yesulin/current}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

case "$KEEP_RELEASES" in
  ''|*[!0-9]*)
    echo "KEEP_RELEASES must be a positive integer" >&2
    exit 1
    ;;
esac
if [ "$KEEP_RELEASES" -lt 1 ]; then
  echo "KEEP_RELEASES must be at least 1" >&2
  exit 1
fi

release_root_real="$(readlink -f "$RELEASE_ROOT")"
current_real="$(readlink -f "$CURRENT_LINK")"
if [ -z "$release_root_real" ] || [ ! -d "$release_root_real" ]; then
  echo "Release root is unavailable: $RELEASE_ROOT" >&2
  exit 1
fi
if [ "$release_root_real" = / ]; then
  echo "Refusing to use the filesystem root as the release directory" >&2
  exit 1
fi
case "$current_real" in
  "$release_root_real"/*) ;;
  *)
    echo "Current release is outside $release_root_real: $current_real" >&2
    exit 1
    ;;
esac
current_name="$(basename "$current_real")"
if ! printf '%s' "$current_name" | grep -Eq '^[0-9a-fA-F]{7,64}$'; then
  echo "Current release has an unexpected name: $current_real" >&2
  exit 1
fi

release_list="$(mktemp)"
cleanup() {
  rm -f "$release_list"
}
trap cleanup EXIT

find "$release_root_real" -mindepth 1 -maxdepth 1 -type d \
  -printf '%T@\t%p\n' | sort -rn > "$release_list"

kept=1
while IFS="$(printf '\t')" read -r _modified release_path; do
  [ -n "$release_path" ] || continue
  release_real="$(readlink -f "$release_path")"
  release_name="$(basename "$release_real")"
  if ! printf '%s' "$release_name" | grep -Eq '^[0-9a-fA-F]{7,64}$'; then
    echo "Skipping unexpected release directory: $release_real" >&2
    continue
  fi
  [ "$release_real" = "$current_real" ] && continue

  if [ "$kept" -lt "$KEEP_RELEASES" ]; then
    kept=$((kept + 1))
    continue
  fi

  case "$release_real" in
    "$release_root_real"/*) ;;
    *)
      echo "Refusing to remove a path outside $release_root_real: $release_real" >&2
      exit 1
      ;;
  esac
  echo "Removing stale release: $release_real"
  rm -rf -- "$release_real"
done < "$release_list"

echo "Release cleanup complete; keeping at most $KEEP_RELEASES releases"
