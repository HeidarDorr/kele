#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

corepack enable
corepack prepare pnpm@11.18.0 --activate
corepack pnpm@11.18.0 install --frozen-lockfile
corepack pnpm@11.18.0 demo:codespaces:configure
corepack pnpm@11.18.0 demo:codespaces:infra
corepack pnpm@11.18.0 demo:codespaces:migrate
corepack pnpm@11.18.0 demo:codespaces:seed
corepack pnpm@11.18.0 demo:codespaces:build

echo "KELE Codespaces dependencies, migrations, and synthetic demo data are ready."
