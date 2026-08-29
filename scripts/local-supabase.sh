#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/supabase-exec.sh
source "$SCRIPT_DIR/supabase-exec.sh"
load_supabase_project_config
cd "$SUPABASE_REPO_ROOT"

case "${1:-}" in
  start)
    if start_output=$(supabase_cli start 2>&1); then
      printf '%s\n' "$start_output"
      exit 0
    fi
    printf '%s\n' "$start_output" >&2
    if [[ "$start_output" != *"schema"*"$SUPABASE_SCHEMA"*"does not exist"* ]]; then
      exit 1
    fi
    echo "Bootstrapping the missing '$SUPABASE_SCHEMA' schema from local migrations." >&2
    supabase_cli db start
    supabase_cli db reset --local --no-seed
    supabase_cli stop
    supabase_cli start
    ;;
  stop)
    supabase_cli stop --no-backup
    ;;
  status)
    supabase_cli status
    ;;
  reset)
    supabase_cli db reset --local --no-seed
    ;;
  *)
    echo "usage: $0 <start|stop|status|reset>" >&2
    exit 1
    ;;
esac
