#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIDGET_DIR="$ROOT/macos-widget"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "The macOS WidgetKit extension must be built on macOS." >&2
  exit 1
fi

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required. Install it with: brew install xcodegen" >&2
  exit 1
fi

cd "$WIDGET_DIR"
xcodegen generate

XCODEBUILD_ARGS=(
  -project MicrosoftTodoWidget.xcodeproj \
  -scheme TodoWidgetExtension \
  -configuration Release \
  -derivedDataPath build
)

if [[ -n "${MACOS_SIGNING_IDENTITY:-}" ]]; then
  XCODEBUILD_ARGS+=("CODE_SIGN_IDENTITY=$MACOS_SIGNING_IDENTITY")

  if [[ -n "${APPLE_DEVELOPMENT_TEAM:-}" ]]; then
    XCODEBUILD_ARGS+=("DEVELOPMENT_TEAM=$APPLE_DEVELOPMENT_TEAM")
  fi
else
  XCODEBUILD_ARGS+=("CODE_SIGNING_ALLOWED=NO")
fi

xcodebuild "${XCODEBUILD_ARGS[@]}" \
  build

find "$WIDGET_DIR/build" -name "TodoWidgetExtension.appex" -type d -print
