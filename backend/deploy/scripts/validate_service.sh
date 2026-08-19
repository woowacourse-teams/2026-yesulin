#!/bin/sh
set -eu

if ! systemctl is-active --quiet yesulin.service; then
  systemctl status yesulin.service --no-pager || true
  journalctl -u yesulin.service -n 50 --no-pager || true
  exit 1
fi
