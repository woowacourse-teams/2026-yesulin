#!/bin/sh
set -eu

REVISION="${1:-}"

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
mkdir -p "$BUNDLE_DIR/nginx" "$BUNDLE_DIR/scripts" "$BUNDLE_DIR/systemd"
cp build/libs/application.jar "$BUNDLE_DIR/application.jar"
cp "$DEPLOY_DIR/appspec.yml" "$BUNDLE_DIR/appspec.yml"
cp "$DEPLOY_DIR/scripts/"*.sh "$BUNDLE_DIR/scripts/"
cp "$DEPLOY_DIR/nginx/"*.conf "$BUNDLE_DIR/nginx/"
cp "$DEPLOY_DIR/systemd/yesulin.service" "$BUNDLE_DIR/systemd/yesulin.service"
chmod +x "$BUNDLE_DIR/scripts/"*.sh
printf '%s\n' "$REVISION" > "$BUNDLE_DIR/revision.txt"
(cd "$BUNDLE_DIR" && sha256sum application.jar > application.jar.sha256)
