#!/bin/sh
set -eu

if [ ! -r /opt/yesulin/current/yesulin.env ]; then
  echo "Missing /opt/yesulin/current/yesulin.env" >&2
  exit 1
fi

systemctl enable yesulin.service

if ! systemctl restart yesulin.service; then
  echo "yesulin.service 시작 실패 — 진단 로그" >&2
  systemctl status yesulin.service --no-pager -l >&2 || true
  journalctl -u yesulin.service -b -n 80 --no-pager >&2 || true
  exit 1
fi