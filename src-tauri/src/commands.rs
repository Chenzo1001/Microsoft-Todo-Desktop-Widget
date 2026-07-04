use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

use crate::{
    auth, db, debug_console,
    models::{
        AuthStatusDto, LoginStartDto, SettingsDto, SettingsPatch, SyncStatusDto, TaskDto,
        TaskListDto, TaskPatchDto,
    },
    settings, sync, widget_snapshot, AppState,
};

#[tauri::command]
pub fn get_today_tasks(state: State<'_, AppState>) -> Result<Vec<TaskDto>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::list_today_tasks(&conn).map_err(to_string)
}

#[tauri::command]
pub fn get_task_lists(state: State<'_, AppState>) -> Result<Vec<TaskListDto>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::list_task_lists(&conn).map_err(to_string)
}

#[tauri::command]
pub fn get_tasks_for_list(
    state: State<'_, AppState>,
    list_id: String,
) -> Result<Vec<TaskDto>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::list_tasks_for_list(&conn, &list_id).map_err(to_string)
}

#[tauri::command]
pub fn get_task(state: State<'_, AppState>, task_id: String) -> Result<TaskDto, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::get_task(&conn, &task_id).map_err(to_string)
}

#[tauri::command]
pub fn get_task_id_for_window(
    state: State<'_, AppState>,
    label: String,
) -> Result<Option<String>, String> {
    let windows = state
        .detail_windows
        .lock()
        .map_err(|_| "detail window lock poisoned".to_string())?;
    Ok(windows.get(&label).cloned())
}

#[tauri::command]
pub fn close_task_details_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(to_string)?;
    }

    if let Some(state) = app.try_state::<AppState>() {
        let mut windows = state
            .detail_windows
            .lock()
            .map_err(|_| "detail window lock poisoned".to_string())?;
        windows.remove(&label);
    }

    Ok(())
}

#[tauri::command]
pub fn add_task(
    state: State<'_, AppState>,
    title: String,
    list_role: String,
) -> Result<TaskDto, String> {
    let role = match list_role.as_str() {
        "today" | "inbox" | "this_week" => list_role,
        _ => "today".to_string(),
    };

    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    let task = db::insert_local_task(&conn, title.trim(), &role).map_err(to_string)?;
    let _ = widget_snapshot::export_today(&conn, &state.macos_app_group_id);
    Ok(task)
}

#[tauri::command]
pub fn add_task_to_list(
    state: State<'_, AppState>,
    title: String,
    list_id: String,
) -> Result<TaskDto, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    let task = db::insert_local_task_for_list(&conn, title.trim(), &list_id).map_err(to_string)?;
    let _ = widget_snapshot::export_today(&conn, &state.macos_app_group_id);
    Ok(task)
}

#[tauri::command]
pub fn complete_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::complete_local_task(&conn, &task_id).map_err(to_string)?;
    let _ = widget_snapshot::export_today(&conn, &state.macos_app_group_id);
    Ok(())
}

#[tauri::command]
pub fn update_task(
    state: State<'_, AppState>,
    task_id: String,
    patch: TaskPatchDto,
) -> Result<TaskDto, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    let task = db::update_local_task(&conn, &task_id, &patch).map_err(to_string)?;
    let _ = widget_snapshot::export_today(&conn, &state.macos_app_group_id);
    Ok(task)
}

#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<SyncStatusDto, String> {
    {
        let mut status = state
            .sync_status
            .lock()
            .map_err(|_| "sync status lock poisoned".to_string())?;
        status.state = "syncing".to_string();
        status.message = Some("Syncing".to_string());
    }

    let next = sync::sync_now(&state).await;
    let mut status = state
        .sync_status
        .lock()
        .map_err(|_| "sync status lock poisoned".to_string())?;
    *status = next.clone();
    Ok(next)
}

#[tauri::command]
pub async fn sync_list_now(
    state: State<'_, AppState>,
    list_id: String,
) -> Result<SyncStatusDto, String> {
    {
        let mut status = state
            .sync_status
            .lock()
            .map_err(|_| "sync status lock poisoned".to_string())?;
        status.state = "syncing".to_string();
        status.message = Some("Syncing current list".to_string());
    }

    let next = sync::sync_list_now(&state, &list_id).await;
    let mut status = state
        .sync_status
        .lock()
        .map_err(|_| "sync status lock poisoned".to_string())?;
    *status = next.clone();
    Ok(next)
}

#[tauri::command]
pub async fn login(app: AppHandle, state: State<'_, AppState>) -> Result<LoginStartDto, String> {
    let session = auth::prepare_browser_login(&state)
        .await
        .map_err(to_string)?;
    let client_id = state
        .client_id
        .clone()
        .ok_or_else(|| "MICROSOFT_CLIENT_ID is not configured".to_string())?;
    let tenant = state.tenant.clone();
    let http = state.http.clone();
    let auth_url = session.auth_url.clone();

    app.opener()
        .open_url(auth_url.clone(), None::<&str>)
        .map_err(to_string)?;

    {
        let mut status = state
            .sync_status
            .lock()
            .map_err(|_| "sync status lock poisoned".to_string())?;
        status.state = "auth_required".to_string();
        status.message = Some("Waiting for Microsoft login".to_string());
    }

    let app_for_poll = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = auth::complete_browser_login(http, tenant, client_id, session).await;

        if let Some(state) = app_for_poll.try_state::<AppState>() {
            if let Ok(mut status) = state.sync_status.lock() {
                match result {
                    Ok(ref refresh_token) => {
                        if let Ok(conn) = state.db.lock() {
                            let _ = db::save_auth_refresh_token(&conn, refresh_token);
                        }
                        status.state = "syncing".to_string();
                        status.message =
                            Some("Login complete. Syncing Microsoft To Do".to_string());
                    }
                    Err(error) => {
                        status.state = "auth_required".to_string();
                        status.message = Some(error.to_string());
                    }
                }
            }

            if auth::has_refresh_token(&state) {
                let next = sync::sync_now(&state).await;
                if let Ok(mut status) = state.sync_status.lock() {
                    *status = next;
                }
            }
        }
    });

    Ok(LoginStartDto {
        auth_url,
        message: "Microsoft sign-in window opened".to_string(),
    })
}

#[tauri::command]
pub fn logout(state: State<'_, AppState>) -> Result<(), String> {
    auth::clear_refresh_token(&state).map_err(to_string)?;
    let mut status = state
        .sync_status
        .lock()
        .map_err(|_| "sync status lock poisoned".to_string())?;
    *status = SyncStatusDto::auth_required("Logged out");
    Ok(())
}

#[tauri::command]
pub fn get_sync_status(state: State<'_, AppState>) -> Result<SyncStatusDto, String> {
    let mut status = state
        .sync_status
        .lock()
        .map_err(|_| "sync status lock poisoned".to_string())?
        .clone();

    if status.last_synced_at.is_none() {
        let conn = state
            .db
            .lock()
            .map_err(|_| "database lock poisoned".to_string())?;
        status.last_synced_at = db::last_synced_at(&conn).map_err(to_string)?;
    }

    if !auth::has_refresh_token(&state) && status.state == "idle" {
        status = SyncStatusDto::auth_required("Login required");
    }

    Ok(status)
}

#[tauri::command]
pub fn get_auth_status(state: State<'_, AppState>) -> AuthStatusDto {
    let account = state
        .db
        .lock()
        .ok()
        .and_then(|conn| db::load_auth_account(&conn).ok())
        .flatten();

    AuthStatusDto {
        logged_in: auth::has_refresh_token(&state),
        account,
    }
}

#[tauri::command]
pub fn get_inbox_count(state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::inbox_count(&conn).map_err(to_string)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<SettingsDto, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_settings(&conn).map_err(to_string)
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    settings: SettingsPatch,
) -> Result<SettingsDto, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    let current = db::load_settings(&conn).map_err(to_string)?;
    let next = settings::apply_patch(current, settings);
    db::save_settings(&conn, &next).map_err(to_string)?;
    debug_console::apply(next.debug_mode);
    Ok(next)
}

#[tauri::command]
pub async fn open_task_details(app: AppHandle, task_id: String) -> Result<(), String> {
    let hash = format!("{:x}", Sha256::digest(task_id.as_bytes()));
    let label = format!("task-details-{}", &hash[..16]);

    if let Some(state) = app.try_state::<AppState>() {
        let mut windows = state
            .detail_windows
            .lock()
            .map_err(|_| "detail window lock poisoned".to_string())?;
        windows.insert(label.clone(), task_id);
    }

    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(to_string)?;
        window.set_focus().map_err(to_string)?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .title("Task details")
        .inner_size(430.0, 640.0)
        .min_inner_size(360.0, 480.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .visible(true)
        .build()
        .map_err(to_string)?;

    Ok(())
}

#[tauri::command]
pub fn set_window_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    match mode.as_str() {
        "pinned" => {
            window.show().map_err(to_string)?;
            window.set_always_on_top(true).map_err(to_string)?;
            window.set_focus().map_err(to_string)?;
        }
        "hidden" => {
            window.hide().map_err(to_string)?;
        }
        _ => {
            window.show().map_err(to_string)?;
            window.set_always_on_top(false).map_err(to_string)?;
            window.set_focus().map_err(to_string)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn start_drag(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    window.start_dragging().map_err(to_string)
}

#[tauri::command]
pub fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(to_string)
}

fn to_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}
