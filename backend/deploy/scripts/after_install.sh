#!/bin/sh
set -eu

DEPLOYMENT_DIR=/opt/yesulin/deployment
REVISION="$(tr -d '\r\n' < "$DEPLOYMENT_DIR/revision.txt")"

if ! printf '%s' "$REVISION" | grep -Eq '^[0-9a-fA-F]{7,64}$'; then
  echo "Invalid revision: $REVISION" >&2
  exit 1
fi

(cd "$DEPLOYMENT_DIR" && sha256sum --check application.jar.sha256)

RELEASE_DIR="/opt/yesulin/releases/$REVISION"
install -d -o root -g yesulin -m 0750 "$RELEASE_DIR"
install -o root -g yesulin -m 0640 "$DEPLOYMENT_DIR/application.jar" "$RELEASE_DIR/application.jar"

if [ -e /opt/yesulin/current ] && [ ! -L /opt/yesulin/current ]; then
  echo "/opt/yesulin/current exists and is not a symbolic link" >&2
  exit 1
fi

ln -sfn "$RELEASE_DIR" /opt/yesulin/current
install -o root -g root -m 0644 "$DEPLOYMENT_DIR/systemd/yesulin.service" /etc/systemd/system/yesulin.service
systemctl daemon-reload
