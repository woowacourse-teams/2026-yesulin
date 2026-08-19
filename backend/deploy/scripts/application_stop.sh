#!/bin/sh
set -eu

if systemctl list-unit-files yesulin.service --no-legend 2>/dev/null | grep -q '^yesulin.service'; then
  systemctl stop yesulin.service
fi
