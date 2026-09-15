#!/bin/sh
set -eu

DEREGISTRATION_DELAY_SECONDS=60

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <target-group-arn>" >&2
  exit 1
fi

target_group_arn=$1

case "$target_group_arn" in
  arn:aws:elasticloadbalancing:*:*:targetgroup/yesulin-backend-tg/*) ;;
  *)
    echo "Refusing to modify a target group other than yesulin-backend-tg" >&2
    exit 1
    ;;
esac

# Staging currently has one target, so draining blocks new requests while the target is absent.
# Sixty seconds still protects ordinary in-flight requests without paying the ALB default 300-second
# wait on every deployment. Reassess this value before adding long-lived requests or streaming.
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$target_group_arn" \
  --attributes "Key=deregistration_delay.timeout_seconds,Value=$DEREGISTRATION_DELAY_SECONDS"

applied_delay=$(aws elbv2 describe-target-group-attributes \
  --target-group-arn "$target_group_arn" \
  --query "Attributes[?Key=='deregistration_delay.timeout_seconds'].Value | [0]" \
  --output text)

if [ "$applied_delay" != "$DEREGISTRATION_DELAY_SECONDS" ]; then
  echo "Expected deregistration delay ${DEREGISTRATION_DELAY_SECONDS}s, got ${applied_delay}s" >&2
  exit 1
fi

echo "ALB deregistration delay: ${applied_delay}s"
