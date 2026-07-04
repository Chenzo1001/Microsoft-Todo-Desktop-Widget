use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub graph_id: Option<String>,
    pub list_id: String,
    pub title: String,
    pub status: String,
    pub importance: Option<String>,
    pub note: Option<String>,
    pub due_date_time: Option<String>,
    pub reminder_date_time: Option<String>,
    pub completed_date_time: Option<String>,
    pub time_zone: Option<String>,
    pub is_reminder_on: bool,
    pub recurrence: Option<serde_json::Value>,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub dirty: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatchDto {
    pub title: String,
    pub importance: Option<String>,
    pub note: Option<String>,
    pub due_date_time: Option<String>,
    pub reminder_date_time: Option<String>,
    pub time_zone: Option<String>,
    pub is_reminder_on: bool,
    pub recurrence: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListDto {
    pub id: String,
    pub display_name: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusDto {
    pub state: String,
    pub last_synced_at: Option<String>,
    pub message: Option<String>,
}

impl SyncStatusDto {
    pub fn idle() -> Self {
        Self {
            state: "idle".to_string(),
            last_synced_at: None,
            message: None,
        }
    }

    pub fn auth_required(message: impl Into<String>) -> Self {
        Self {
            state: "auth_required".to_string(),
            last_synced_at: None,
            message: Some(message.into()),
        }
    }

    pub fn error(message: impl Into<String>, last_synced_at: Option<String>) -> Self {
        Self {
            state: "error".to_string(),
            last_synced_at,
            message: Some(message.into()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct SettingsDto {
    pub always_on_top: bool,
    pub opacity: f64,
    pub sync_interval_minutes: i64,
    pub autostart: bool,
    pub debug_mode: bool,
    pub show_completed: bool,
    pub font_family: String,
    pub font_scale: f64,
}

impl Default for SettingsDto {
    fn default() -> Self {
        Self {
            always_on_top: false,
            opacity: 0.78,
            sync_interval_minutes: 3,
            autostart: false,
            debug_mode: false,
            show_completed: false,
            font_family: "system".to_string(),
            font_scale: 1.0,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub always_on_top: Option<bool>,
    pub opacity: Option<f64>,
    pub sync_interval_minutes: Option<i64>,
    pub autostart: Option<bool>,
    pub debug_mode: Option<bool>,
    pub show_completed: Option<bool>,
    pub font_family: Option<String>,
    pub font_scale: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatusDto {
    pub logged_in: bool,
    pub account: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginStartDto {
    pub auth_url: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TokenResponse {
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphTaskList {
    pub id: String,
    pub display_name: String,
    pub wellknown_list_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphUserProfile {
    pub display_name: Option<String>,
    pub user_principal_name: Option<String>,
    pub mail: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GraphCollection<T> {
    pub value: Vec<T>,
    #[serde(rename = "@odata.nextLink")]
    pub next_link: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphTask {
    pub id: String,
    pub title: String,
    pub status: Option<String>,
    pub importance: Option<String>,
    pub body: Option<GraphItemBody>,
    pub due_date_time: Option<GraphDateTimeTimeZone>,
    pub reminder_date_time: Option<GraphDateTimeTimeZone>,
    pub completed_date_time: Option<GraphDateTimeTimeZone>,
    pub is_reminder_on: Option<bool>,
    pub recurrence: Option<serde_json::Value>,
    pub created_date_time: Option<String>,
    pub last_modified_date_time: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphItemBody {
    pub content: Option<String>,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphDateTimeTimeZone {
    pub date_time: Option<String>,
    pub time_zone: Option<String>,
}
