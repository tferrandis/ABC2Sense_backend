#!/usr/bin/env bash
set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"
DB_NAME="${DB_NAME:-abc2sense_restore_test}"
BACKUP_FILE="${BACKUP_FILE:-}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: BACKUP_FILE is required and must exist" >&2
  exit 1
fi

mongorestore \
  --uri="$MONGO_URI" \
  --nsFrom="*." \
  --nsTo="$DB_NAME." \
  --archive="$BACKUP_FILE" \
  --gzip \
  --drop

echo "Restore completed into DB: $DB_NAME"
