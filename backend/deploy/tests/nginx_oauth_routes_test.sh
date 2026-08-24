#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
NGINX_DIRECTORY="$TEST_DIRECTORY/../nginx"

assert_guarded_proxy() {
  config_file="$1"
  route="$2"

  if ! awk -v route="$route" '
    $0 ~ "^[[:space:]]*location \\^~ " route " \\{" {
      in_location = 1
      locations++
      next
    }
    in_location && /yesulin-origin-guard\.conf/ { guard = 1 }
    in_location && /yesulin-spring-proxy\.conf/ { proxy = 1 }
    in_location && /^[[:space:]]*}/ {
      in_location = 0
    }
    END {
      exit !(locations == 1 && guard && proxy)
    }
  ' "$config_file"; then
    echo "Expected one guarded Spring proxy for $route in $config_file" >&2
    exit 1
  fi
}

if ! grep -Fq 'proxy_pass http://127.0.0.1:8080;' \
  "$NGINX_DIRECTORY/yesulin-spring-proxy.conf"; then
  echo "Expected the Spring proxy snippet to target 127.0.0.1:8080" >&2
  exit 1
fi

for config_file in \
  "$NGINX_DIRECTORY/yesulin.conf" \
  "$NGINX_DIRECTORY/yesulin-tls.conf"; do
  assert_guarded_proxy "$config_file" "/api/v1/"
  assert_guarded_proxy "$config_file" "/oauth2/"
  assert_guarded_proxy "$config_file" "/login/oauth2/"
done

echo "Nginx OAuth route tests passed"
