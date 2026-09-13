#!/bin/sh
set -eu

if [ ! -r /opt/yesulin/current/yesulin.env ]; then
  echo "Missing /opt/yesulin/current/yesulin.env" >&2
  exit 1
fi

systemctl enable yesulin.service

# AMI 부팅 중 환경 파일 없이 시작해 누적된 실패 횟수를 배포 후 초기화한다.
systemctl reset-failed yesulin.service

if ! systemctl restart yesulin.service; then
  echo "yesulin.service 시작 실패 — 진단 로그" >&2
  systemctl status yesulin.service --no-pager -l >&2 || true
  journalctl -u yesulin.service -b -n 80 --no-pager >&2 || true
  exit 1
fi
