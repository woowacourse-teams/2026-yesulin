#!/bin/sh
set -eu

TEST_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MIGRATION_SCRIPT="$TEST_DIRECTORY/../scripts/migrate_legacy_public_files.sh"
TEMP_DIRECTORY="$(mktemp -d)"
FAKE_BIN="$TEMP_DIRECTORY/bin"
ENVIRONMENT_FILE="$TEMP_DIRECTORY/yesulin.env"
MARKER_FILE="$TEMP_DIRECTORY/migrated"

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/aws" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" > "$AWS_ARGUMENTS_FILE"
EOF
cat > "$FAKE_BIN/install" <<'EOF'
#!/bin/sh
exit 0
EOF
cat > "$FAKE_BIN/chown" <<'EOF'
#!/bin/sh
exit 0
EOF
cat > "$FAKE_BIN/chmod" <<'EOF'
#!/bin/sh
exit 0
EOF
chmod +x "$FAKE_BIN/aws" "$FAKE_BIN/install" "$FAKE_BIN/chown" "$FAKE_BIN/chmod"

cat > "$ENVIRONMENT_FILE" <<'EOF'
YESULIN_STORAGE_S3_BUCKET=techcourse-project-2026
YESULIN_STORAGE_S3_KEY_PREFIX=yesulin
EOF

AWS_ARGUMENTS_FILE="$TEMP_DIRECTORY/aws-arguments" \
ENVIRONMENT_FILE="$ENVIRONMENT_FILE" \
MARKER_FILE="$MARKER_FILE" \
PATH="$FAKE_BIN:$PATH" \
  sh "$MIGRATION_SCRIPT"

EXPECTED='s3 sync s3://techcourse-project-2026/yesulin/files/ s3://techcourse-project-2026/yesulin/public/files/ --only-show-errors'
if [ "$(cat "$TEMP_DIRECTORY/aws-arguments")" != "$EXPECTED" ]; then
  echo "Unexpected AWS S3 migration command" >&2
  exit 1
fi

if [ ! -f "$MARKER_FILE" ]; then
  echo "Expected migration marker" >&2
  exit 1
fi

echo "Legacy public file migration tests passed"
