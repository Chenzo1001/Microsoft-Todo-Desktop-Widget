use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn init(app: &AppHandle) -> anyhow::Result<()> {
    let shortcut = Shortcut::new(Some(quick_add_modifiers()), Code::KeyT);
    let result = app
        .global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval(quick_add_event_js());
                }
            }
        });

    if let Err(error) = result {
        eprintln!(
            "global shortcut {} was not registered: {error}",
            quick_add_label()
        );
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn quick_add_modifiers() -> Modifiers {
    Modifiers::SUPER | Modifiers::ALT
}

#[cfg(not(target_os = "macos"))]
fn quick_add_modifiers() -> Modifiers {
    Modifiers::CONTROL | Modifiers::ALT
}

#[cfg(target_os = "macos")]
fn quick_add_event_js() -> &'static str {
    "window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', metaKey: true, altKey: true }));"
}

#[cfg(not(target_os = "macos"))]
fn quick_add_event_js() -> &'static str {
    "window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', ctrlKey: true, altKey: true }));"
}

#[cfg(target_os = "macos")]
fn quick_add_label() -> &'static str {
    "Cmd+Option+T"
}

#[cfg(not(target_os = "macos"))]
fn quick_add_label() -> &'static str {
    "Ctrl+Alt+T"
}
