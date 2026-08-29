#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/supabase-exec.sh
source "$SCRIPT_DIR/supabase-exec.sh"
load_supabase_project_config

DB_CONTAINER="${SUPABASE_DB_CONTAINER:-cf-supabase-dygaax-supabase-db}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"

for setting in "$DB_CONTAINER" "$DB_USER" "$DB_NAME"; do
  if [[ ! "$setting" =~ ^[A-Za-z0-9_.-]+$ ]]; then
    echo "Invalid self-hosted database setting '$setting'." >&2
    exit 1
  fi
done

if [[ "$#" -eq 0 ]]; then
  echo "usage: bun run db:migrate -- <migration.sql> [more.sql ...]" >&2
  exit 1
fi

if supabase_container_is_local "$DB_CONTAINER"; then
  psql_in() {
    supabase_docker exec -i "$DB_CONTAINER" \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
  }
  location="local docker ($DB_CONTAINER)"
else
  supabase_require_remote_ssh "$DB_CONTAINER"
  psql_in() {
    ssh "$SUPABASE_SSH_HOST" \
      "docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 $*"
  }
  location="ssh $SUPABASE_SSH_HOST ($DB_CONTAINER)"
fi

echo "Applying $# migration(s) to '$SUPABASE_SCHEMA' via $location"
for migration in "$@"; do
  if [[ ! -f "$migration" ]]; then
    echo "Migration not found: $migration" >&2
    exit 1
  fi
  echo "  -> $migration"
  psql_in < "$migration"
done

schema_exists=$(
  printf "select count(*) from pg_namespace where nspname = '%s';\n" "$SUPABASE_SCHEMA" |
    psql_in -At
)
if [[ "${schema_exists//[[:space:]]/}" != 1 ]]; then
  echo "Migrations completed but schema '$SUPABASE_SCHEMA' was not found; refusing success." >&2
  exit 1
fi

echo "Verified schema '$SUPABASE_SCHEMA'. Run bun run gen:types next."
