#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_PATH="$ROOT/.env"

if [[ -f "$ENV_PATH" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_PATH"
  set +a
fi

if [[ -z "${MICROSOFT_CLIENT_ID:-}" ]]; then
  echo "MICROSOFT_CLIENT_ID was not found in .env or environment." >&2
  exit 1
fi

cd "$ROOT"
npm run tauri:build
