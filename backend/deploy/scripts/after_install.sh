#!/bin/sh
set -eu

DEPLOYMENT_DIR=/opt/yesulin/deployment
REVISION="$(tr -d '\r\n' < "$DEPLOYMENT_DIR/revision.txt")"
ENVIRONMENT_FILE=/etc/yesulin/yesulin.env

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

if ! command -v nginx >/dev/null 2>&1; then
  echo "Nginx is not installed" >&2
  exit 1
fi

ORIGIN_SECRET="$(sed -n 's/^YESULIN_CLOUDFRONT_ORIGIN_SECRET=//p' "$ENVIRONMENT_FILE")"
if [ "${#ORIGIN_SECRET}" -ne 64 ] || printf '%s' "$ORIGIN_SECRET" | grep -q '[^0-9a-fA-F]'; then
  echo "YESULIN_CLOUDFRONT_ORIGIN_SECRET must be exactly 64 hexadecimal characters" >&2
  exit 1
fi

GUARD_FILE=/etc/nginx/snippets/yesulin-origin-guard.conf
GUARD_TEMP="$(mktemp)"
trap 'rm -f "$GUARD_TEMP"' EXIT
install -d -o root -g root -m 0755 /etc/nginx/snippets
printf 'if ($http_x_yesulin_origin_secret != "%s") { return 403; }\n' \
  "$ORIGIN_SECRET" > "$GUARD_TEMP"
install -o root -g root -m 0600 "$GUARD_TEMP" "$GUARD_FILE"

"$DEPLOYMENT_DIR/scripts/configure_nginx.sh"

install -d -o root -g root -m 0755 /etc/letsencrypt/renewal-hooks/deploy
install -o root -g root -m 0755 \
  "$DEPLOYMENT_DIR/scripts/reload_nginx_after_renewal.sh" \
  /etc/letsencrypt/renewal-hooks/deploy/yesulin-nginx
