# macOS WidgetKit Extension

This directory contains the native macOS WidgetKit implementation for the compact desktop widget.

The Tauri app remains responsible for:

- Microsoft authentication.
- Microsoft To Do sync.
- SQLite cache and pending operations.
- Full task editing and settings UI.
- Exporting a small JSON snapshot into the App Group container.

The WidgetKit extension is responsible only for:

- Reading `todo-widget-snapshot.json` from the shared App Group container.
- Rendering the Today/Main task list.
- Opening the host app when the widget is clicked.

## App Group

The placeholder App Group is:

```text
group.com.local.ms-todo-desktop-widget
```

Before building for a real Apple Developer account, replace this value in:

- `Sources/WidgetConfig.swift`
- `Entitlements/TodoWidgetExtension.entitlements`
- `Entitlements/HostApp.entitlements`
- `project.yml`
- `.env` or `ms-todo-desktop-widget.config.json` as `MACOS_APP_GROUP_ID` / `macos_app_group_id`

The host app and widget extension must use the same App Group ID.

## Snapshot Contract

The host app writes this file:

```text
~/Library/Group Containers/<APP_GROUP_ID>/todo-widget-snapshot.json
```

Shape:

```json
{
  "version": 1,
  "exportedAt": "2026-07-04T10:00:00Z",
  "lastSyncedAt": "2026-07-04T10:00:00Z",
  "listName": "Today",
  "tasks": [
    {
      "id": "task id",
      "title": "Task title",
      "importance": "normal",
      "dueDateTime": "2026-07-04T00:00:00",
      "reminderDateTime": null,
      "timeZone": "Asia/Shanghai",
      "isReminderOn": false,
      "dirty": false
    }
  ]
}
```

## Generate Xcode Project

The checked-in `project.yml` is for XcodeGen. On macOS:

```bash
brew install xcodegen
cd macos-widget
xcodegen generate
```

Then open `MicrosoftTodoWidget.xcodeproj`, set signing/team settings, and build `TodoWidgetExtension`.

## Packaging Into The Tauri App

Tauri does not turn a WebView window into a WidgetKit widget. The widget must be built as a native `.appex` and embedded into the final `.app` bundle under:

```text
YourApp.app/Contents/PlugIns/TodoWidgetExtension.appex
```

Both the host app and the extension must be signed with matching App Group entitlements.

The current implementation provides the source and shared-data contract. Final release packaging should be wired on a macOS machine after the Apple Developer Team ID and App Group ID are known.
