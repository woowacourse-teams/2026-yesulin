#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo sh ops/recover/rollback-release.sh COMMIT_SHA --confirm" >&2
  exit 1
fi

revision="${1:-}"
confirmation="${2:-}"
if ! printf '%s' "$revision" | grep -Eq '^[0-9a-fA-F]{7,64}$'; then
  echo "Provide an exact release directory name containing 7-64 hexadecimal characters" >&2
  exit 2
fi
if [ "$confirmation" != "--confirm" ]; then
  echo "Rollback changes only the application JAR; it does not roll back Flyway migrations." >&2
  echo "Confirm with: sudo sh ops/recover/rollback-release.sh $revision --confirm" >&2
  exit 2
fi

release_root=/opt/yesulin/releases
target="$release_root/$revision"
if [ ! -s "$target/application.jar" ]; then
  echo "$target/application.jar is missing or empty" >&2
  exit 1
fi

previous="$(readlink -f /opt/yesulin/current 2>/dev/null || true)"
if [ -z "$previous" ] || [ ! -s "$previous/application.jar" ]; then
  echo "Current release is unavailable; refusing rollback" >&2
  exit 1
fi
if [ "$previous" = "$target" ]; then
  echo "$revision is already current"
  exit 0
fi

echo "Switching current release from $previous to $target"
ln -sfn "$target" /opt/yesulin/current

if sh "$(dirname "$0")/restart-app.sh"; then
  echo "Rollback completed: $revision"
  exit 0
fi

echo "Rollback target failed health check; restoring $previous" >&2
ln -sfn "$previous" /opt/yesulin/current
systemctl restart yesulin.service || true
exit 1
