#!/bin/sh
set -eu
umask 077

: "${SUPABASE_SOURCE_DB_URL:?Set SUPABASE_SOURCE_DB_URL to the source project connection string}"

backup_root="${BACKUP_ROOT:-.backups/supabase}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_directory="$backup_root/$timestamp"
mkdir -p "$backup_directory"

pnpm exec supabase db dump \
  --db-url "$SUPABASE_SOURCE_DB_URL" \
  --file "$backup_directory/roles.sql" \
  --role-only
pnpm exec supabase db dump \
  --db-url "$SUPABASE_SOURCE_DB_URL" \
  --file "$backup_directory/schema.sql"
pnpm exec supabase db dump \
  --db-url "$SUPABASE_SOURCE_DB_URL" \
  --file "$backup_directory/data.sql" \
  --use-copy \
  --data-only \
  --exclude storage.buckets_vectors \
  --exclude storage.vector_indexes

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$backup_directory" && sha256sum roles.sql schema.sql data.sql > manifest.sha256)
else
  (cd "$backup_directory" && shasum -a 256 roles.sql schema.sql data.sql > manifest.sha256)
fi

printf '%s\n' "Logical Supabase backup created at $backup_directory"
printf '%s\n' "This supplements platform backups; it does not replace managed auth/storage recovery."
