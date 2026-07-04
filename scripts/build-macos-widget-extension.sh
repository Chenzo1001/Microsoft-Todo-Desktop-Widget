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

xcodebuild \
  -project MicrosoftTodoWidget.xcodeproj \
  -scheme TodoWidgetExtension \
  -configuration Release \
  -derivedDataPath build \
  build

find "$WIDGET_DIR/build" -name "TodoWidgetExtension.appex" -type d -print
