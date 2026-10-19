#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
environment=${1:-$(cat "$script_dir/../deployment-environment.txt")}
role=${2:-backend}
case "$environment:$role" in dev:backend|prod:backend|dev:database|prod:database) ;; *) exit 2 ;; esac
[ "$(id -u)" = 0 ] || { echo 'Run as root' >&2; exit 1; }
[ "$(uname -m)" = aarch64 ] || { echo 'Ubuntu ARM64 required' >&2; exit 1; }
. /etc/os-release
[ "$ID" = ubuntu ] || { echo 'Ubuntu required' >&2; exit 1; }
command -v python3 >/dev/null

agent_dir=/opt/aws/amazon-cloudwatch-agent
config_path=$agent_dir/etc/amazon-cloudwatch-agent.json
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM
python3 "$script_dir/../monitoring/render_agent.py" "$config_path" "$work_dir/config.json" "$environment" "$role"
if [ ! -x "$agent_dir/bin/amazon-cloudwatch-agent-ctl" ]; then
  curl --fail --silent --show-error --connect-timeout 5 --max-time 60 \
    https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/arm64/latest/amazon-cloudwatch-agent.deb \
    -o "$work_dir/agent.deb"
  # 새 인스턴스는 부팅 직후 unattended-upgrades가 패키지 잠금을 잡고 있을 수 있어 잠금이 풀릴 때까지 기다린다.
  DEBIAN_FRONTEND=noninteractive apt-get install -y -o DPkg::Lock::Timeout=60 "$work_dir/agent.deb"
fi
install -d /etc/systemd/system/amazon-cloudwatch-agent.service.d
cat > "$work_dir/timezone.conf" <<'TIMEZONE'
[Service]
Environment=TZ=Asia/Seoul
TIMEZONE
changed=false
if ! cmp -s "$config_path" "$work_dir/config.json"; then
  [ ! -f "$config_path" ] || cp -p "$config_path" "$config_path.before-yesulin"
  install -m 0644 "$work_dir/config.json" "$config_path"
  changed=true
fi
if ! cmp -s /etc/systemd/system/amazon-cloudwatch-agent.service.d/yesulin-timezone.conf "$work_dir/timezone.conf"; then
  install -m 0644 "$work_dir/timezone.conf" /etc/systemd/system/amazon-cloudwatch-agent.service.d/yesulin-timezone.conf
  changed=true
fi
systemctl daemon-reload
if [ "$changed" = true ] || ! systemctl is-active --quiet amazon-cloudwatch-agent; then
  "$agent_dir/bin/amazon-cloudwatch-agent-ctl" -a fetch-config -m ec2 -s -c "file:$config_path"
fi
systemctl enable amazon-cloudwatch-agent
systemctl is-active --quiet amazon-cloudwatch-agent
