#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: sh ops/backup/verify-logical-backup.sh /path/to/backup.sql.gz" >&2
  exit 2
fi

backup_file="$1"
if [ ! -r "$backup_file" ]; then
  echo "Backup is not readable: $backup_file" >&2
  exit 1
fi

gzip -t "$backup_file"
if ! gzip -cd "$backup_file" | grep -q '^CREATE DATABASE'; then
  echo "Backup does not contain a database definition" >&2
  exit 1
fi

echo "Backup compression and SQL structure checks passed: $backup_file"
echo "A full restore must still be tested on an isolated MySQL 8.4 instance."
