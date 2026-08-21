#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo" >&2
  exit 1
fi
if [ "${1:-}" != "--email" ] || [ -z "${2:-}" ] || [ "${3:-}" != "--confirm" ]; then
  echo "Usage: sudo /opt/yesulin/deployment/scripts/issue_origin_certificate.sh --email you@example.com --confirm" >&2
  exit 2
fi
if ! command -v certbot >/dev/null 2>&1; then
  echo "Certbot is missing. Install it first: sudo apt-get install -y certbot" >&2
  exit 1
fi

email="$2"
origin_host="${ORIGIN_HOST:-origin.yesulin.art}"
challenge_root=/var/www/letsencrypt

install -d -o root -g root -m 0755 "$challenge_root/.well-known/acme-challenge"
if ! getent ahostsv4 "$origin_host" >/dev/null 2>&1; then
  echo "$origin_host does not resolve to an IPv4 address" >&2
  exit 1
fi

metadata_token="$(curl -fsS -X PUT \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
  http://169.254.169.254/latest/api/token)"
public_ip="$(curl -fsS \
  -H "X-aws-ec2-metadata-token: $metadata_token" \
  http://169.254.169.254/latest/meta-data/public-ipv4)"
if ! getent ahostsv4 "$origin_host" | awk '{print $1}' | grep -Fxq "$public_ip"; then
  echo "$origin_host does not resolve directly to this EC2 public IP ($public_ip)" >&2
  echo "Use a Cloudflare DNS-only A record before issuing the certificate" >&2
  exit 1
fi

certbot certonly --webroot \
  --webroot-path "$challenge_root" \
  --domain "$origin_host" \
  --email "$email" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

/opt/yesulin/deployment/scripts/configure_nginx.sh
systemctl reload nginx.service
certbot renew --dry-run

echo "Certificate issued and Nginx switched to HTTPS for $origin_host"
