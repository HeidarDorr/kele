#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
state_directory="$repository_root/.data/codespaces"
pid_file="$state_directory/apps.pid"
boot_file="$state_directory/apps.boot-id"

if [[ ! -f "$pid_file" ]]; then
  echo "KELE Codespaces applications are not recorded as running."
  exit 0
fi

application_pid="$(cat "$pid_file")"
if kill -0 "$application_pid" 2>/dev/null; then
  kill -- -"$application_pid" 2>/dev/null || kill "$application_pid" 2>/dev/null || true
  for _ in {1..20}; do
    if ! kill -0 "$application_pid" 2>/dev/null; then break; fi
    sleep 0.25
  done
fi

rm -f "$pid_file" "$boot_file"
echo "KELE Codespaces applications stopped."
