#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/supabase-exec.sh
source "$SCRIPT_DIR/supabase-exec.sh"
load_supabase_project_config

OUT="${SUPABASE_TYPES_OUT:-$SUPABASE_REPO_ROOT/src/lib/supabase/database-generated.types.ts}"
SCHEMA_FILE="$SUPABASE_REPO_ROOT/src/lib/supabase/database-schema.generated.ts"
META_CONTAINER="${SUPABASE_META_CONTAINER:-cf-supabase-dygaax-supabase-meta}"
if [[ ! "$META_CONTAINER" =~ ^[A-Za-z0-9_.-]+$ ]]; then
  echo "Invalid SUPABASE_META_CONTAINER '$META_CONTAINER'." >&2
  exit 1
fi
RAW=$(mktemp)
mkdir -p "$(dirname "$OUT")"
NEXT=$(mktemp "$(dirname "$OUT")/.database-generated.types.XXXXXX.ts")
cleanup() { rm -f "$RAW" "$NEXT"; }
trap cleanup EXIT

if [[ ! -f "$SCHEMA_FILE" ]] ||
  ! grep -Fq "databaseSchema = '$SUPABASE_SCHEMA'" "$SCHEMA_FILE"; then
  echo "Generated schema config does not match '$SUPABASE_SCHEMA'." >&2
  echo "Run bun run supabase:configure -- $SUPABASE_SCHEMA before generating types." >&2
  exit 1
fi

generate_self_hosted() {
  local generator_js remote_command
  generator_js='const schema = process.argv[1]; const url = `http://localhost:8080/generators/typescript?included_schemas=${encodeURIComponent(schema)}`; fetch(url).then(async (response) => { const body = await response.text(); if (!response.ok) throw new Error(`${response.status}: ${body}`); process.stdout.write(body); });'

  if supabase_container_is_local "$META_CONTAINER"; then
    supabase_docker exec "$META_CONTAINER" node -e "$generator_js" "$SUPABASE_SCHEMA" > "$RAW"
    return
  fi

  supabase_require_remote_ssh "$META_CONTAINER"
  printf -v remote_command 'docker exec %q node -e %q %q' \
    "$META_CONTAINER" "$generator_js" "$SUPABASE_SCHEMA"
  ssh "$SUPABASE_SSH_HOST" "$remote_command" > "$RAW"
}

generate_local() {
  supabase_cli gen types --local --lang typescript --schema "$SUPABASE_SCHEMA" > "$RAW"
}

if [[ "$SUPABASE_TYPES_SOURCE" == local ]]; then
  generate_local
else
  generate_self_hosted
fi

if ! grep -q "export type Database" "$RAW" ||
  ! grep -Eq "^[[:space:]]+$SUPABASE_SCHEMA: \\{" "$RAW"; then
  echo "Generation failed; output is not a Database type scoped to '$SUPABASE_SCHEMA':" >&2
  head -5 "$RAW" >&2
  exit 1
fi

{
  echo "// GENERATED - do not edit by hand."
  echo "// Schema: $SUPABASE_SCHEMA. Re-run \`bun run gen:types\` after migrations."
  echo
  cat "$RAW"
} > "$NEXT"

"$SCRIPT_DIR/../node_modules/.bin/oxfmt" -c "$SCRIPT_DIR/../oxfmt.config.ts" "$NEXT" >/dev/null
chmod 0644 "$NEXT"
mv "$NEXT" "$OUT"

echo "Wrote $OUT from '$SUPABASE_SCHEMA' ($SUPABASE_TYPES_SOURCE)."
