#!/bin/sh
set -eu

environment=${1:?Usage: sudo sh ops/monitor/cloudwatch/install_database.sh dev|prod}
case "$environment" in dev|prod) ;; *) exit 2 ;; esac
[ "$(id -u)" = 0 ] || { echo 'Run as root' >&2; exit 1; }
[ "$(uname -m)" = aarch64 ] || { echo 'Ubuntu ARM64 required' >&2; exit 1; }
. /etc/os-release
[ "$ID" = ubuntu ] || { echo 'Ubuntu required' >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../../.." && pwd)
# Verify read-only collection before enabling the timer or changing Agent configuration.
python3 "$script_dir/database_metrics.py" "$environment" --once >/dev/null
install -d -m 0700 /etc/yesulin-monitoring
printf 'MONITORING_ENVIRONMENT=%s\n' "$environment" > /etc/yesulin-monitoring/environment
chmod 0600 /etc/yesulin-monitoring/environment
install -d -m 0755 /opt/yesulin-monitoring
install -m 0644 "$script_dir/database_metrics.py" /opt/yesulin-monitoring/database_metrics.py
install -m 0644 "$script_dir/systemd/"*.service "$script_dir/systemd/"*.timer /etc/systemd/system/
sh "$repo_root/backend/deploy/scripts/install_monitoring.sh" "$environment" database
systemctl daemon-reload
systemctl start yesulin-database-metrics.service
systemctl enable --now yesulin-database-metrics.timer
