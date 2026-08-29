#!/usr/bin/env bash

# Shared by the self-hosted migration and type-generation scripts. Source this file.

SUPABASE_DOCKER_COMMAND=()
SUPABASE_SSH_HOST="${SUPABASE_SSH_HOST:-alex}"
SUPABASE_DOCKER_RUN_USER=""

load_supabase_project_config() {
  local root config configured_schema configured_source
  root="${SUPABASE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
  config="${SUPABASE_PROJECT_CONFIG:-$root/supabase/project.env}"
  if [[ ! -f "$config" ]]; then
    echo "Missing $config. Run bun run supabase:configure -- <schema>." >&2
    return 1
  fi

  configured_schema=$(sed -n 's/^SUPABASE_SCHEMA=//p' "$config")
  configured_source=$(sed -n 's/^SUPABASE_TYPES_SOURCE=//p' "$config")
  SUPABASE_SCHEMA="${SUPABASE_SCHEMA:-$configured_schema}"
  SUPABASE_TYPES_SOURCE="${SUPABASE_TYPES_SOURCE:-${configured_source:-self_hosted}}"
  SUPABASE_REPO_ROOT="$root"

  if [[ ! "$SUPABASE_SCHEMA" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "Invalid SUPABASE_SCHEMA '$SUPABASE_SCHEMA'." >&2
    return 1
  fi
  if [[ "$SUPABASE_SCHEMA" == replace_me ]]; then
    echo "Run bun run supabase:configure -- <schema> before database work." >&2
    return 1
  fi
  if [[ "$SUPABASE_TYPES_SOURCE" != self_hosted && "$SUPABASE_TYPES_SOURCE" != local ]]; then
    echo "SUPABASE_TYPES_SOURCE must be 'self_hosted' or 'local'." >&2
    return 1
  fi
}

detect_supabase_docker() {
  local run_user
  SUPABASE_DOCKER_COMMAND=()
  SUPABASE_DOCKER_RUN_USER=""

  if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    SUPABASE_DOCKER_COMMAND=(docker)
    return 0
  fi

  run_user=$(id -un)
  if command -v sudo >/dev/null 2>&1 &&
    sudo -n -u "$run_user" -g docker docker ps >/dev/null 2>&1; then
    SUPABASE_DOCKER_COMMAND=(sudo -n -u "$run_user" -g docker docker)
    SUPABASE_DOCKER_RUN_USER="$run_user"
    return 0
  fi

  return 1
}

supabase_container_is_local() {
  local container="$1"
  detect_supabase_docker || return 1
  supabase_docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$container"
}

supabase_docker() {
  if [[ "${#SUPABASE_DOCKER_COMMAND[@]}" -eq 0 ]]; then
    echo "Supabase Docker access has not been detected." >&2
    return 1
  fi
  "${SUPABASE_DOCKER_COMMAND[@]}" "$@"
}

supabase_cli() {
  local cli
  cli="${SUPABASE_CLI:-$SUPABASE_REPO_ROOT/node_modules/.bin/supabase}"
  detect_supabase_docker || {
    echo "Docker is required for local Supabase commands." >&2
    return 1
  }

  if [[ "${SUPABASE_DOCKER_COMMAND[0]}" == docker ]]; then
    "$cli" "$@"
    return
  fi

  sudo -n -u "$SUPABASE_DOCKER_RUN_USER" -g docker env \
    "PATH=$PATH" "$cli" "$@"
}

supabase_ssh_host_is_local() {
  local host local_names local_addresses address
  host="${SUPABASE_SSH_HOST##*@}"
  case "$host" in
    localhost | 127.* | ::1) return 0 ;;
  esac

  local_names="$(hostname 2>/dev/null || true) $(hostname -s 2>/dev/null || true) $(hostname -f 2>/dev/null || true)"
  for local_name in $local_names; do
    [[ "$host" == "$local_name" ]] && return 0
  done

  local_addresses="$(hostname -I 2>/dev/null || true)"
  while read -r address _; do
    case "$address" in
      127.* | ::1) return 0 ;;
    esac
    [[ " $local_addresses " == *" $address "* ]] && return 0
  done < <(getent ahosts "$host" 2>/dev/null || true)
  return 1
}

supabase_require_remote_ssh() {
  local container="$1"
  if supabase_ssh_host_is_local; then
    echo "Supabase host '$SUPABASE_SSH_HOST' resolves locally, but '$container' is inaccessible through Docker." >&2
    return 1
  fi
}
