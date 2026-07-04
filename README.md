# ms-todo-desktop-widget

A lightweight desktop widget for Microsoft To Do on Windows and macOS.

[![GitHub release (latest by date including pre-releases)](https://Chenzo1001/Microsoft-Todo-Desktop-Widget/assets/Main.jpg)](https://github.com/Chenzo1001/Microsoft-Todo-Desktop-Widget)
[![Settings](https://Chenzo1001/Microsoft-Todo-Desktop-Widget/assets/Settings.jpg)](https://github.com/Chenzo1001/Microsoft-Todo-Desktop-Widget)
[![Task Details](https://Chenzo1001/Microsoft-Todo-Desktop-Widget/assets/Details.jpg)](https://github.com/Chenzo1001/Microsoft-Todo-Desktop-Widget)

This is not a full Microsoft To Do replacement. It is a small desktop surface for the tasks you want visible all day:

- See open tasks in the `Today` list.
- Add tasks quickly.
- Complete tasks with one click.
- Sync through Microsoft Graph so the official Microsoft To Do apps remain the source of truth.

## Status

The current implementation has the MVP framework in place:

- Tauri v2 + React + TypeScript + Vite.
- Frameless transparent widget window.
- Local SQLite cache.
- Local-first add and complete commands.
- Microsoft browser sign-in with Authorization Code + PKCE and a local loopback callback.
- Microsoft Graph To Do API client scaffold.
- Pending operation queue for offline/local-first sync.
- Tray/menu-bar menu and quick-add shortcut:
  - Windows: `Ctrl + Alt + T`
  - macOS: `Cmd + Option + T`
- Basic settings persistence for opacity, pinning, sync interval, and autostart preference.

Autostart is currently persisted as a setting only. Wiring it to `tauri-plugin-autostart` is a follow-up.

## Azure App Registration

Create an app registration in Microsoft Entra:

1. Open Azure Portal.
2. Go to Microsoft Entra ID.
3. Create an App Registration.
4. Supported account types:
   - Personal Microsoft accounts only if you use `consumers`.
   - Any org directory and personal accounts if you use `common`.
5. Enable public client/native flows if required by your tenant settings.
6. Add a desktop/native redirect URI for loopback login:
   - `http://127.0.0.1`
   - If your tenant requires an exact URI, add the URI shown in the Microsoft redirect mismatch error.
7. Add delegated Microsoft Graph permissions:
   - `User.Read`
   - `Tasks.ReadWrite`
   - `offline_access`

Do not create or use a client secret. This is a desktop public client.

## Microsoft Client ID Configuration

Microsoft sign-in requires an Azure App Registration client id. The app does not expose this in the UI.

For development, set these before running Tauri:

```powershell
$env:MICROSOFT_CLIENT_ID = "your Azure app client id"
$env:MICROSOFT_TENANT = "consumers"
```

`MICROSOFT_TENANT` defaults to `consumers` when omitted. Use `common` if you want to allow work or school accounts.

For a built app, environment variables from your current terminal may not exist when you double-click it. Use one of these instead:

1. Build with the client id baked in:

```powershell
$env:MICROSOFT_CLIENT_ID = "your Azure app client id"
npm run tauri:build
```

On macOS:

```bash
export MICROSOFT_CLIENT_ID="your Azure app client id"
npm run tauri:build:mac
```

2. Or place `ms-todo-desktop-widget.config.json` next to the executable/app bundle:

```json
{
  "microsoft_client_id": "your Azure app client id",
  "microsoft_tenant": "consumers"
}
```

## Run

```powershell
npm install
npm run tauri:dev
```

The Vite-only frontend can be checked with:

```powershell
npm run dev
```

## Build

```powershell
npm run tauri:build
```

macOS bundles must be built on macOS:

```bash
npm install
./scripts/build-tauri-with-env.sh
```

This produces the macOS `.app` and `.dmg` under `src-tauri/target/release/bundle/`.

## Data Storage

The SQLite cache is stored in the Tauri app data directory under:

```text
ms-todo-desktop-widget/cache.sqlite3
```

The exact base directory depends on the OS and Tauri's app data resolution.

## Token Security

The refresh token is stored with the OS credential store through the Rust `keyring` crate. Access tokens are requested by the Rust backend and are not exposed to React or browser local storage.

## Core Lists

On sync, the backend ensures these Microsoft To Do lists exist:

- `Today`
- `Inbox`
- `This Week`

The main widget displays uncompleted tasks from `Today`. The quick-add overlay defaults to `Inbox`.
