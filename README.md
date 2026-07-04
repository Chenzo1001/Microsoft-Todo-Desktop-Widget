# Microsoft To Do Desktop Widget

A lightweight desktop widget for Microsoft To Do on Windows and macOS.

This project is not a full Microsoft To Do replacement. It is a small, frameless desktop surface for the tasks you want visible throughout the day, while Microsoft To Do remains the source of truth.

## Screenshots

![Main widget](assets/Main.jpg)

![Settings](assets/Settings.jpg)

![Task details](assets/Details.jpg)

## Features

- Frameless transparent desktop widget with right-click menu controls.
- Microsoft browser sign-in with Authorization Code + PKCE.
- Microsoft Graph sync for To Do lists and tasks.
- Remote list selector, including custom Microsoft To Do lists.
- Local SQLite cache with pending operation queue.
- Add, complete, edit, and sync tasks.
- Task details window with due date, reminder, repeat, importance, and notes.
- Task sorting by due date, importance, modified time, created time, reminder, and title.
- Optional completed-task display with distinct completed styling.
- Due-today and overdue task highlighting.
- Adjustable opacity, font family, text size, sync interval, and debug console.
- i18n support:
  - System language
  - English
  - Simplified Chinese
- Tray/menu-bar menu and quick-add shortcut:
  - Windows: `Ctrl + Alt + T`
  - macOS: `Cmd + Option + T`

## Tech Stack

- Tauri v2
- React
- TypeScript
- Vite
- Rust
- SQLite via `rusqlite`
- Microsoft Graph To Do API

## Download

Use the GitHub Releases page for prebuilt installers when available.

For source builds, follow the setup steps below.

## Azure App Registration

Microsoft sign-in requires an Azure App Registration. This app is a desktop public client, so do not create or use a client secret.

1. Open the Azure Portal.
2. Go to Microsoft Entra ID.
3. Create an App Registration.
4. Choose supported account types:
   - Use `consumers` for personal Microsoft accounts only.
   - Use `common` for both work/school and personal Microsoft accounts.
5. Add a redirect URI under **Mobile and desktop applications**:
   - `http://localhost`
   - The app uses a local loopback callback with a dynamic port.
   - If Azure shows a redirect mismatch, add the exact URI shown in the error.
6. Add delegated Microsoft Graph permissions:
   - `User.Read`
   - `Tasks.ReadWrite`
   - `offline_access`
7. Enable public client/native flows if your tenant requires it.

## Client ID Configuration

`MICROSOFT_CLIENT_ID` is not a secret, but source builds should normally use their own Azure App Registration.

For development:

```powershell
$env:MICROSOFT_CLIENT_ID = "your Azure app client id"
$env:MICROSOFT_TENANT = "consumers"
npm run tauri:dev
```

`MICROSOFT_TENANT` defaults to `consumers` when omitted.

You can also create a local `.env` file:

```env
MICROSOFT_CLIENT_ID=your Azure app client id
MICROSOFT_TENANT=consumers
```

Do not commit `.env`.

For installed builds, either bake the client ID in at build time or place a config file next to the executable/app bundle.

Build-time configuration:

```powershell
$env:MICROSOFT_CLIENT_ID = "your Azure app client id"
npm run tauri:build
```

Runtime config file:

```json
{
  "microsoft_client_id": "your Azure app client id",
  "microsoft_tenant": "consumers"
}
```

Use `ms-todo-desktop-widget.config.example.json` as the template.

## Development

Install dependencies:

```powershell
npm install
```

Run the Tauri app:

```powershell
npm run tauri:dev
```

Run the Vite-only frontend:

```powershell
npm run dev
```

## Build

Windows:

```powershell
npm run tauri:build
```

Or load `.env` automatically:

```powershell
.\scripts\build-tauri-with-env.ps1
```

macOS bundles must be built on macOS:

```bash
npm install
./scripts/build-tauri-with-env.sh
```

Or:

```bash
export MICROSOFT_CLIENT_ID="your Azure app client id"
npm run tauri:build:mac
```

Build outputs are written under:

```text
src-tauri/target/release/bundle/
```

## Data Storage

The SQLite cache is stored in the Tauri app data directory:

```text
ms-todo-desktop-widget/cache.sqlite3
```

The exact base directory depends on the operating system and Tauri's app data resolution.

Refresh tokens are stored with the OS credential store through the Rust `keyring` crate. Access tokens are requested by the Rust backend and are not exposed to React or browser local storage.

## Notes For Open Source Builds

- Do not commit `.env`, local database files, tokens, or user data.
- `MICROSOFT_CLIENT_ID` can be public, but using your own client ID for public releases means other builds may appear under your Azure app identity.
- Do not add a client secret. Desktop apps should use public client + PKCE.
- Keep Graph permissions minimal unless a feature requires more.

## Current Limitations

- Autostart is currently stored as a setting, but OS-level autostart wiring is still a follow-up.
- macOS packages must be built on macOS.
- This app focuses on a compact widget experience, not complete Microsoft To Do feature parity.

## License

Add a license before publishing the repository publicly.
