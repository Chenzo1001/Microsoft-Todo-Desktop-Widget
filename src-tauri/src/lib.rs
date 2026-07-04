mod auth;
mod commands;
mod config;
mod db;
mod debug_console;
mod graph;
mod hotkey;
mod models;
mod settings;
mod sync;
mod tray;

use std::{collections::HashMap, sync::Mutex};

use anyhow::Context;
use models::SyncStatusDto;
use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub http: reqwest::Client,
    pub sync_status: Mutex<SyncStatusDto>,
    pub detail_windows: Mutex<HashMap<String, String>>,
    pub client_id: Option<String>,
    pub tenant: String,
}

impl AppState {
    fn new(app: &tauri::App) -> anyhow::Result<Self> {
        let app_dir = app
            .path()
            .app_data_dir()
            .context("failed to resolve app data directory")?;
        std::fs::create_dir_all(&app_dir).context("failed to create app data directory")?;

        let db_path = app_dir.join("cache.sqlite3");
        let conn = Connection::open(db_path).context("failed to open sqlite cache")?;
        db::init_db(&conn)?;
        db::ensure_local_core_lists(&conn)?;
        let settings = db::load_settings(&conn)?;
        debug_console::apply(settings.debug_mode);

        Ok(Self {
            db: Mutex::new(conn),
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .context("failed to build http client")?,
            sync_status: Mutex::new(SyncStatusDto::idle()),
            detail_windows: Mutex::new(HashMap::new()),
            client_id: config::client_id(app),
            tenant: config::tenant(app),
        })
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let state = AppState::new(app)?;
            app.manage(state);
            tray::init(app.handle())?;
            hotkey::init(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_today_tasks,
            commands::get_task_lists,
            commands::get_tasks_for_list,
            commands::get_task,
            commands::get_task_id_for_window,
            commands::close_task_details_window,
            commands::add_task,
            commands::add_task_to_list,
            commands::complete_task,
            commands::update_task,
            commands::open_task_details,
            commands::sync_now,
            commands::sync_list_now,
            commands::login,
            commands::logout,
            commands::get_sync_status,
            commands::get_auth_status,
            commands::get_inbox_count,
            commands::get_settings,
            commands::update_settings,
            commands::set_window_mode,
            commands::start_drag,
            commands::start_window_drag
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
