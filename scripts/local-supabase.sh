#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/supabase-exec.sh
source "$SCRIPT_DIR/supabase-exec.sh"
load_supabase_project_config
cd "$SUPABASE_REPO_ROOT"

case "${1:-}" in
  start)
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
