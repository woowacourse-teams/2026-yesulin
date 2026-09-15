#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY="$(CDPATH= cd -- "$TEST_DIRECTORY/../../.." && pwd)"
BUILD_SPEC="$REPOSITORY/buildspec.yml"

assert_contains() {
  expected="$1"
  if ! grep -Fqx -- "$expected" "$BUILD_SPEC"; then
    echo "Expected buildspec line: $expected" >&2
    exit 1
  fi
}

# Given the CodeBuild pipeline only needs dependency and wrapper reuse
# When the cache configuration is inspected
# Then task outputs are not generated or transferred as part of the S3 cache
assert_contains "      - ./gradlew bootJar --no-daemon --no-build-cache"
assert_contains "      - sh deploy/tests/buildspec_cache_test.sh"
assert_contains "      - du -sh /root/.gradle/caches/modules-2 /root/.gradle/wrapper"
assert_contains "    - '/root/.gradle/caches/modules-2/**/*'"
assert_contains "    - '/root/.gradle/wrapper/**/*'"

if grep -Fqx -- "    - '/root/.gradle/caches/**/*'" "$BUILD_SPEC"; then
  echo "The entire Gradle cache must not be transferred through S3" >&2
  exit 1
fi

echo "Buildspec cache scope tests passed"
