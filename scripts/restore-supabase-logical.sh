#!/bin/sh
set -eu

: "${SUPABASE_TARGET_DB_URL:?Set SUPABASE_TARGET_DB_URL to a new recovery project}"
: "${BACKUP_DIRECTORY:?Set BACKUP_DIRECTORY to a verified logical backup directory}"
: "${RESTORE_TARGET_ENVIRONMENT:?Set RESTORE_TARGET_ENVIRONMENT to staging or recovery-drill}"
: "${CONFIRM_NON_PRODUCTION_RESTORE:?Explicit confirmation is required}"

case "$RESTORE_TARGET_ENVIRONMENT" in
  staging|recovery-drill) ;;
  *) echo "Restore target must be staging or recovery-drill" >&2; exit 1 ;;
esac

if [ "$CONFIRM_NON_PRODUCTION_RESTORE" != "RESTORE_TO_NEW_NON_PRODUCTION_PROJECT" ]; then
  echo "Set CONFIRM_NON_PRODUCTION_RESTORE=RESTORE_TO_NEW_NON_PRODUCTION_PROJECT" >&2
  exit 1
fi

if [ -n "${SUPABASE_SOURCE_DB_URL:-}" ] && [ "$SUPABASE_SOURCE_DB_URL" = "$SUPABASE_TARGET_DB_URL" ]; then
  echo "Source and target database URLs must not match" >&2
  exit 1
fi

for file in roles.sql schema.sql data.sql manifest.sha256; do
  if [ ! -f "$BACKUP_DIRECTORY/$file" ]; then
    echo "Missing backup artifact: $file" >&2
    exit 1
  fi
done

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$BACKUP_DIRECTORY" && sha256sum --check manifest.sha256)
else
  (cd "$BACKUP_DIRECTORY" && shasum -a 256 --check manifest.sha256)
fi

command -v psql >/dev/null 2>&1 || {
  echo "psql is required for a logical restore" >&2
  exit 1
}

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$BACKUP_DIRECTORY/roles.sql" \
  --file "$BACKUP_DIRECTORY/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$BACKUP_DIRECTORY/data.sql" \
  --dbname "$SUPABASE_TARGET_DB_URL"

printf '%s\n' "Logical restore completed in $RESTORE_TARGET_ENVIRONMENT."
printf '%s\n' "Run database, HTTP, entitlement and cross-device checks before accepting the drill."
