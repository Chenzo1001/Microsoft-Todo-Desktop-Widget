use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn init(app: &AppHandle) -> anyhow::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Widget", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide Widget", true, None::<&str>)?;
    let pin = MenuItem::with_id(app, "pin", "Pin / Unpin", true, None::<&str>)?;
    let sync = MenuItem::with_id(app, "sync", "Sync Now", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &pin, &sync, &settings, &quit])?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if let Some(window) = app.get_webview_window("main") {
                match event.id.as_ref() {
                    "show" => {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    "hide" => {
                        let _ = window.hide();
                    }
                    "pin" => {
                        let next = !window.is_always_on_top().unwrap_or(false);
                        let _ = window.set_always_on_top(next);
                        let _ = window.show();
                    }
                    "sync" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app.try_state::<crate::AppState>() {
                                let next = crate::sync::sync_now(&state).await;
                                if let Ok(mut status) = state.sync_status.lock() {
                                    *status = next;
                                }
                            }
                        });
                    }
                    "settings" => {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    "quit" => app.exit(0),
                    _ => {}
                }
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}
