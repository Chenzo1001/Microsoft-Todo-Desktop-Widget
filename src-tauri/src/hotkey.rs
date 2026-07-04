use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn init(app: &AppHandle) -> anyhow::Result<()> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyT);
    let result = app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.eval(
                    "window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', ctrlKey: true, altKey: true }));",
                );
            }
        }
    });

    if let Err(error) = result {
        eprintln!("global shortcut Ctrl+Alt+T was not registered: {error}");
    }

    Ok(())
}
