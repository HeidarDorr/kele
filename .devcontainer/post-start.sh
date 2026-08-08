#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

corepack pnpm@11.18.0 demo:codespaces:configure
corepack pnpm@11.18.0 demo:codespaces:infra
if [[ ! -f apps/api/dist/main.js || ! -f apps/storefront/.next/BUILD_ID || ! -f apps/admin/.next/BUILD_ID ]]; then
  corepack pnpm@11.18.0 demo:codespaces:build
fi
corepack pnpm@11.18.0 demo:codespaces:start
