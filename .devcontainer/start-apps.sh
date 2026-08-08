#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

environment_file="$repository_root/.env.codespaces"
state_directory="$repository_root/.data/codespaces"
pid_file="$state_directory/apps.pid"
boot_file="$state_directory/apps.boot-id"
log_file="$state_directory/apps.log"
current_boot_id="$(cat /proc/sys/kernel/random/boot_id)"

if [[ ! -f "$environment_file" ]] || ! grep -q '^KELE_DEMO_PROFILE=codespaces$' "$environment_file"; then
  echo "The guarded Codespaces demo environment is missing. Run pnpm demo:codespaces:configure first." >&2
  exit 1
fi

mkdir -p "$state_directory"

if [[ -f "$pid_file" && -f "$boot_file" && "$(cat "$boot_file")" == "$current_boot_id" ]]; then
  existing_pid="$(cat "$pid_file")"
  if kill -0 "$existing_pid" 2>/dev/null; then
    existing_command="$(tr '\0' ' ' < "/proc/$existing_pid/cmdline" 2>/dev/null || true)"
    if [[ "$existing_command" == *".devcontainer/run-apps.sh"* ]]; then
      echo "KELE Codespaces applications are already running (PID $existing_pid)."
      corepack pnpm@11.18.0 demo:codespaces:urls
      exit 0
    fi
  fi
fi

rm -f "$pid_file" "$boot_file"
touch "$log_file"

nohup setsid bash .devcontainer/run-apps.sh >>"$log_file" 2>&1 </dev/null &

application_pid="$!"
printf '%s\n' "$application_pid" > "$pid_file"
printf '%s\n' "$current_boot_id" > "$boot_file"

deadline=$((SECONDS + 120))
api_ready=false
storefront_ready=false
admin_ready=false
while (( SECONDS < deadline )); do
  if ! kill -0 "$application_pid" 2>/dev/null; then break; fi
  if [[ "$api_ready" == false ]] && curl --fail --silent --max-time 3 \
    --output /dev/null http://127.0.0.1:3001/api/v1/health/ready; then
    api_ready=true
  fi
  if [[ "$storefront_ready" == false ]] && curl --fail --silent --max-time 3 \
    --output /dev/null http://127.0.0.1:3000/; then
    storefront_ready=true
  fi
  if [[ "$admin_ready" == false ]] && curl --fail --silent --max-time 3 \
    --output /dev/null http://127.0.0.1:3002/; then
    admin_ready=true
  fi
  if [[ "$api_ready" == true && "$storefront_ready" == true && "$admin_ready" == true ]]; then
    break
  fi
  sleep 2
done

if [[ "$api_ready" != true || "$storefront_ready" != true || "$admin_ready" != true ]]; then
  kill -- -"$application_pid" 2>/dev/null || kill "$application_pid" 2>/dev/null || true
  rm -f "$pid_file" "$boot_file"
  echo "KELE Codespaces applications failed readiness; setup will not report a false-ready demo." >&2
  for service in api storefront admin; do
    echo "--- $service ---" >&2
    tail -n 60 "$state_directory/$service.log" >&2 || true
  done
  exit 1
fi

echo "KELE Codespaces applications started (PID $application_pid)."
echo "Service logs: $state_directory/{api,storefront,admin}.log"
corepack pnpm@11.18.0 demo:codespaces:urls
