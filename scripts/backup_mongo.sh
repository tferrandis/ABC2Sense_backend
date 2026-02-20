#!/usr/bin/env bash
set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"
DB_NAME="${DB_NAME:-abc2sense}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/abc2sense}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/${DB_NAME}-${TS}.archive.gz"

mongodump \
  --uri="$MONGO_URI" \
  --db="$DB_NAME" \
  --archive="$OUT_FILE" \
  --gzip

# Retention cleanup (daily)
find "$BACKUP_DIR" -type f -name "${DB_NAME}-*.archive.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $OUT_FILE"
