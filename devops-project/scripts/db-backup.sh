#!/usr/bin/env bash
# Day 14 - logical backup of the PeopleFlow database, with retention.
# Works against any reachable PostgreSQL (compose, Kubernetes port-forward,
# or Azure Flexible Server). A backup that has never been restored is not
# a backup: see docs/runbooks/rollback-and-restore.md for the restore drill.
#
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/peopleflow_hr ./db-backup.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$BACKUP_DIR/peopleflow_${STAMP}.dump"

mkdir -p "$BACKUP_DIR"
# Prisma URLs carry ?schema=...; pg_dump does not understand it.
PG_URL="${DATABASE_URL%%\?*}"

echo "Backing up to $FILE"
pg_dump --format=custom --no-owner --dbname="$PG_URL" --file="$FILE"
sha256sum "$FILE" > "$FILE.sha256"

echo "Pruning backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name 'peopleflow_*.dump*' -mtime +"$KEEP_DAYS" -print -delete

echo "Done. Restore with:"
echo "  pg_restore --clean --if-exists --no-owner --dbname=\"\$TARGET_URL\" $FILE"
