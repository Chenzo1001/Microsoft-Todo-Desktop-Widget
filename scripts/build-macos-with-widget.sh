#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_PATH="$ROOT/.env"
APP_NAME="ms-todo-desktop-widget"
APP_BUNDLE="$APP_NAME.app"
APP_PATH="$ROOT/src-tauri/target/release/bundle/macos/$APP_BUNDLE"
DMG_DIR="$ROOT/src-tauri/target/release/bundle/dmg"
HOST_ENTITLEMENTS="$ROOT/macos-widget/Entitlements/HostApp.entitlements"
WIDGET_ENTITLEMENTS="$ROOT/macos-widget/Entitlements/TodoWidgetExtension.entitlements"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "The macOS app with WidgetKit extension must be built on macOS." >&2
  exit 1
fi

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

"$ROOT/scripts/build-macos-widget-extension.sh"

cd "$ROOT"
npm run tauri -- build --bundles app --no-sign

WIDGET_PATH="$(find "$ROOT/macos-widget/build" -path "*/Release/TodoWidgetExtension.appex" -type d -print -quit)"
if [[ -z "$WIDGET_PATH" ]]; then
  echo "TodoWidgetExtension.appex was not found after the widget build." >&2
  exit 1
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "Tauri app bundle was not found at: $APP_PATH" >&2
  exit 1
fi

PLUGINS_DIR="$APP_PATH/Contents/PlugIns"
EMBEDDED_WIDGET="$PLUGINS_DIR/TodoWidgetExtension.appex"
mkdir -p "$PLUGINS_DIR"
rm -rf "$EMBEDDED_WIDGET"
ditto "$WIDGET_PATH" "$EMBEDDED_WIDGET"

SIGNING_IDENTITY="${MACOS_SIGNING_IDENTITY:--}"
CODESIGN_ARGS=(--force --sign "$SIGNING_IDENTITY")

if [[ "$SIGNING_IDENTITY" == "-" ]]; then
  CODESIGN_ARGS+=(--timestamp=none)
else
  CODESIGN_ARGS+=(--options runtime)
fi

codesign "${CODESIGN_ARGS[@]}" --entitlements "$WIDGET_ENTITLEMENTS" "$EMBEDDED_WIDGET"
codesign "${CODESIGN_ARGS[@]}" --entitlements "$HOST_ENTITLEMENTS" "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "$APP_PATH"
if [[ "${SKIP_DMG:-0}" == "1" ]]; then
  exit 0
fi

mkdir -p "$DMG_DIR"
VERSION="$(node -p "require('./package.json').version")"
ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
  DMG_ARCH="aarch64"
else
  DMG_ARCH="$ARCH"
fi

DMG_PATH="$DMG_DIR/${APP_NAME}_${VERSION}_${DMG_ARCH}.dmg"
DMG_ROOT="$(mktemp -d)"
trap 'rm -rf "$DMG_ROOT"' EXIT

ditto "$APP_PATH" "$DMG_ROOT/$APP_BUNDLE"
ln -s /Applications "$DMG_ROOT/Applications"
rm -f "$DMG_PATH"
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$DMG_ROOT" \
  -srcowners off \
  -fs "HFS+" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

echo "$DMG_PATH"
