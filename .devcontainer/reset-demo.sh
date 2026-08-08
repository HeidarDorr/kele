#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

bash .devcontainer/stop-apps.sh
corepack pnpm@11.18.0 demo:codespaces:migrate
corepack pnpm@11.18.0 demo:codespaces:seed
bash .devcontainer/start-apps.sh

echo "The isolated kele_e2e database was reset to the deterministic synthetic fixture."
