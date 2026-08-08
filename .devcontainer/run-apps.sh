#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

environment_file="$repository_root/.env.codespaces"
state_directory="$repository_root/.data/codespaces"
children=()

shutdown() {
  trap - EXIT INT TERM
  for child in "${children[@]}"; do
    kill "$child" 2>/dev/null || true
  done
  wait "${children[@]}" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

corepack pnpm@11.18.0 exec dotenv -e "$environment_file" -- \
  corepack pnpm@11.18.0 --filter @kele/api start:prod \
  >"$state_directory/api.log" 2>&1 &
children+=("$!")

corepack pnpm@11.18.0 exec dotenv -e "$environment_file" -v NODE_ENV=production -- \
  corepack pnpm@11.18.0 --filter @kele/storefront start \
  >"$state_directory/storefront.log" 2>&1 &
children+=("$!")

corepack pnpm@11.18.0 exec dotenv -e "$environment_file" -v NODE_ENV=production -- \
  corepack pnpm@11.18.0 --filter @kele/admin start \
  >"$state_directory/admin.log" 2>&1 &
children+=("$!")

wait -n "${children[@]}"
