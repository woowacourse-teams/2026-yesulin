#!/bin/sh
set -u

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
state_dir=${MONITORING_STATE_DIRECTORY:-/var/lib/yesulin-monitoring}
if sh "$script_dir/install_monitoring.sh"; then
  rm -f "$state_dir/backend-install-failed"
else
  install -d -m 0700 "$state_dir"
  printf '%s\n' 'CloudWatch collection setup failed; inspect CodeDeploy hook output and Agent status.' \
    > "$state_dir/backend-install-failed"
  echo 'WARN CloudWatch collection setup failed; application deployment will continue.' >&2
fi
exit 0
