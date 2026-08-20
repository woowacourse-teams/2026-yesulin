#!/bin/sh
set -eu

if [ ! -r /etc/yesulin/yesulin.env ]; then
  echo "Missing /etc/yesulin/yesulin.env" >&2
  exit 1
fi

systemctl enable yesulin.service
systemctl restart yesulin.service

systemctl enable nginx.service
if systemctl is-active --quiet nginx.service; then
  systemctl reload nginx.service
else
  systemctl start nginx.service
fi
