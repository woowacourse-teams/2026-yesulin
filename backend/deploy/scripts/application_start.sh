#!/bin/sh
set -eu

if [ ! -r /opt/yesulin/current/yesulin.env ]; then
  echo "Missing /opt/yesulin/current/yesulin.env" >&2
  exit 1
fi

systemctl enable yesulin.service
systemctl restart yesulin.service
