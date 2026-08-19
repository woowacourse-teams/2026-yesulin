#!/bin/sh
set -eu

if ! getent group yesulin >/dev/null; then
  groupadd --system yesulin
fi

if ! id yesulin >/dev/null 2>&1; then
  useradd --system --gid yesulin --home-dir /opt/yesulin --shell /usr/sbin/nologin yesulin
fi

install -d -o root -g yesulin -m 0750 /opt/yesulin
install -d -o root -g yesulin -m 0750 /opt/yesulin/deployment
install -d -o root -g yesulin -m 0750 /opt/yesulin/releases
install -d -o root -g yesulin -m 0750 /etc/yesulin

if [ -e /etc/yesulin/yesulin.env ]; then
  chown root:yesulin /etc/yesulin/yesulin.env
  chmod 0640 /etc/yesulin/yesulin.env
fi

find /opt/yesulin/deployment -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
