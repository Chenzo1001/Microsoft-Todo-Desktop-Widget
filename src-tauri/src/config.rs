use std::path::PathBuf;

use serde::Deserialize;
use tauri::Manager;

#[derive(Debug, Deserialize)]
struct AuthConfig {
    #[serde(alias = "clientId", alias = "client_id", alias = "MICROSOFT_CLIENT_ID")]
    microsoft_client_id: Option<String>,
    #[serde(alias = "tenant", alias = "MICROSOFT_TENANT")]
    microsoft_tenant: Option<String>,
}

pub fn client_id(app: &tauri::App) -> Option<String> {
    first_non_empty([
        std::env::var("MICROSOFT_CLIENT_ID").ok(),
        option_env!("MICROSOFT_CLIENT_ID").map(ToString::to_string),
        read_config(app).and_then(|config| config.microsoft_client_id),
    ])
}

pub fn tenant(app: &tauri::App) -> String {
    first_non_empty([
        std::env::var("MICROSOFT_TENANT").ok(),
        option_env!("MICROSOFT_TENANT").map(ToString::to_string),
        read_config(app).and_then(|config| config.microsoft_tenant),
    ])
    .unwrap_or_else(|| "consumers".to_string())
}

fn first_non_empty(values: impl IntoIterator<Item = Option<String>>) -> Option<String> {
    values
        .into_iter()
        .flatten()
        .map(|value| value.trim().to_string())
        .find(|value| !value.is_empty())
}

fn read_config(app: &tauri::App) -> Option<AuthConfig> {
    config_paths(app)
        .into_iter()
        .find_map(|path| read_config_file(&path))
}

fn config_paths(app: &tauri::App) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            paths.push(parent.join("ms-todo-desktop-widget.config.json"));
        }
    }

    if let Ok(app_config_dir) = app.path().app_config_dir() {
        paths.push(app_config_dir.join("config.json"));
    }

    paths
}

fn read_config_file(path: &PathBuf) -> Option<AuthConfig> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}
