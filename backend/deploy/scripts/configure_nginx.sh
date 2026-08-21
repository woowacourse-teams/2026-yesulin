#!/bin/sh
set -eu

DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-/opt/yesulin/deployment}"
ORIGIN_HOST="${ORIGIN_HOST:-origin.yesulin.art}"
certificate_directory="/etc/letsencrypt/live/$ORIGIN_HOST"

install -d -o root -g root -m 0755 /etc/nginx/snippets
install -d -o root -g root -m 0755 /var/www/letsencrypt/.well-known/acme-challenge
install -o root -g root -m 0644 \
  "$DEPLOYMENT_DIR/nginx/yesulin-log-format.conf" \
  /etc/nginx/conf.d/yesulin-log-format.conf

if [ -r "$certificate_directory/fullchain.pem" ] && \
   [ -r "$certificate_directory/privkey.pem" ]; then
  nginx_source="$DEPLOYMENT_DIR/nginx/yesulin-tls.conf"
  echo "Configuring Nginx HTTPS origin for $ORIGIN_HOST"
else
  nginx_source="$DEPLOYMENT_DIR/nginx/yesulin.conf"
  echo "Configuring Nginx HTTP bootstrap origin"
fi

install -o root -g root -m 0644 "$nginx_source" /etc/nginx/sites-available/yesulin
ln -sfn /etc/nginx/sites-available/yesulin /etc/nginx/sites-enabled/yesulin
rm -f /etc/nginx/sites-enabled/default
nginx -t
