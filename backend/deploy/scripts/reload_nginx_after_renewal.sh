#!/bin/sh
set -eu

/opt/yesulin/deployment/scripts/configure_nginx.sh
systemctl reload nginx.service
echo "Nginx reloaded after certificate renewal"
