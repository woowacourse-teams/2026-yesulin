#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CLEANUP_SCRIPT="$TEST_DIRECTORY/../scripts/cleanup_releases.sh"
TEMP_DIRECTORY="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
}
trap cleanup EXIT

release_root="$TEMP_DIRECTORY/releases"
mkdir -p "$release_root"

for revision in 1111111 2222222 3333333 4444444 5555555 6666666 7777777; do
  mkdir "$release_root/$revision"
  sleep 0.01
done
current_link="$release_root/2222222"

RELEASE_ROOT="$release_root" \
CURRENT_LINK="$current_link" \
KEEP_RELEASES=5 \
  sh "$CLEANUP_SCRIPT"

remaining="$(find "$release_root" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
if [ "$remaining" -ne 5 ]; then
  echo "Expected 5 releases, found $remaining" >&2
  exit 1
fi
if [ ! -d "$release_root/2222222" ]; then
  echo "Current release was removed" >&2
  exit 1
fi
if [ -d "$release_root/1111111" ] || [ -d "$release_root/3333333" ]; then
  echo "Old releases were not removed" >&2
  exit 1
fi

echo "Release cleanup tests passed"
