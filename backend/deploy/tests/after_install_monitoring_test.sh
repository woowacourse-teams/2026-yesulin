#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
task_dir=$(mktemp -d)
trap 'rm -rf "$task_dir"' EXIT
cp "$script_dir/../scripts/after_install_monitoring.sh" "$task_dir/after_install_monitoring.sh"
printf '%s\n' '#!/bin/sh' 'exit 1' > "$task_dir/install_monitoring.sh"
MONITORING_STATE_DIRECTORY="$task_dir/state" sh "$task_dir/after_install_monitoring.sh"
[ -s "$task_dir/state/backend-install-failed" ] || { echo 'Missing visible collection failure marker' >&2; exit 1; }
printf '%s\n' '#!/bin/sh' 'exit 0' > "$task_dir/install_monitoring.sh"
MONITORING_STATE_DIRECTORY="$task_dir/state" sh "$task_dir/after_install_monitoring.sh"
[ ! -e "$task_dir/state/backend-install-failed" ] || { echo 'Stale failure marker remains' >&2; exit 1; }
echo 'Agent setup failure does not abort app deployment; recovery clears the marker'
