#!/bin/sh
set -eu

if [ ! -r /etc/yesulin/yesulin.env ]; then
  echo "Missing /etc/yesulin/yesulin.env" >&2
  exit 1
fi

systemctl enable yesulin.service
systemctl restart yesulin.service
