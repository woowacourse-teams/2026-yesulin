#!/bin/sh
set -eu

REVISION="${1:-}"
CONFIG_DIR="${2:-}"
DEPLOY_ENV="${DEPLOY_ENV:-}"

case "$DEPLOY_ENV" in
  dev | prod) ;;
  *) echo 'DEPLOY_ENV must be dev or prod' >&2; exit 1 ;;
esac

ENCRYPTED_ENV="$CONFIG_DIR/server/$DEPLOY_ENV.env"

if [ ! -s "$ENCRYPTED_ENV" ] || ! grep -q '^sops_mac=' "$ENCRYPTED_ENV"; then
  echo "Encrypted $DEPLOY_ENV.env is missing or invalid" >&2
  exit 1
fi

if ! printf '%s' "$REVISION" | grep -Eq '^[0-9a-fA-F]{7,64}$'; then
  echo "Resolved source version is not a Git commit ID: $REVISION" >&2
  exit 1
fi

if [ ! -f build.gradle.kts ] || [ ! -d deploy ]; then
  echo "Run this script from the backend directory" >&2
  exit 1
fi

DEPLOY_DIR=deploy
BUNDLE_DIR=build/deployment

rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/scripts" "$BUNDLE_DIR/systemd" "$BUNDLE_DIR/config"
cp build/libs/application.jar "$BUNDLE_DIR/application.jar"
cp "$DEPLOY_DIR/appspec.yml" "$BUNDLE_DIR/appspec.yml"
cp "$DEPLOY_DIR/scripts/"*.sh "$BUNDLE_DIR/scripts/"
cp "$DEPLOY_DIR/systemd/yesulin.service" "$BUNDLE_DIR/systemd/yesulin.service"
cp "$ENCRYPTED_ENV" "$BUNDLE_DIR/config/runtime.env"
chmod +x "$BUNDLE_DIR/scripts/"*.sh
printf '%s\n' "$REVISION" > "$BUNDLE_DIR/revision.txt"
(cd "$BUNDLE_DIR" && sha256sum application.jar > application.jar.sha256)
