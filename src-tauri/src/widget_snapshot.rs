use chrono::Utc;
use rusqlite::Connection;
use serde::Serialize;

use crate::{db, models::TaskDto};

#[cfg(target_os = "macos")]
const SNAPSHOT_FILE: &str = "todo-widget-snapshot.json";
const MAX_WIDGET_TASKS: usize = 8;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetSnapshot {
    version: u32,
    exported_at: String,
    last_synced_at: Option<String>,
    list_name: String,
    tasks: Vec<WidgetTask>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetTask {
    id: String,
    title: String,
    importance: Option<String>,
    due_date_time: Option<String>,
    reminder_date_time: Option<String>,
    time_zone: Option<String>,
    is_reminder_on: bool,
    dirty: bool,
}

pub fn export_today(conn: &Connection, app_group_id: &str) -> anyhow::Result<()> {
    export_today_with_last_synced(conn, app_group_id, db::last_synced_at(conn)?)
}

pub fn export_today_with_last_synced(
    conn: &Connection,
    app_group_id: &str,
    last_synced_at: Option<String>,
) -> anyhow::Result<()> {
    let tasks = db::list_today_tasks(conn)?
        .into_iter()
        .filter(|task| task.status != "completed")
        .take(MAX_WIDGET_TASKS)
        .map(task_to_widget_task)
        .collect::<Vec<_>>();

    let snapshot = WidgetSnapshot {
        version: 1,
        exported_at: Utc::now().to_rfc3339(),
        last_synced_at,
        list_name: "Today".to_string(),
        tasks,
    };

    write_snapshot(app_group_id, &snapshot)
}

fn task_to_widget_task(task: TaskDto) -> WidgetTask {
    WidgetTask {
        id: task.id,
        title: task.title,
        importance: task.importance,
        due_date_time: task.due_date_time,
        reminder_date_time: task.reminder_date_time,
        time_zone: task.time_zone,
        is_reminder_on: task.is_reminder_on,
        dirty: task.dirty,
    }
}

#[cfg(target_os = "macos")]
fn write_snapshot(app_group_id: &str, snapshot: &WidgetSnapshot) -> anyhow::Result<()> {
    let home = std::env::var_os("HOME")
        .map(std::path::PathBuf::from)
        .ok_or_else(|| anyhow::anyhow!("HOME is not available"))?;
    let dir = home
        .join("Library")
        .join("Group Containers")
        .join(app_group_id);
    std::fs::create_dir_all(&dir)?;
    let path = dir.join(SNAPSHOT_FILE);
    std::fs::write(path, serde_json::to_vec_pretty(snapshot)?)?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn write_snapshot(_app_group_id: &str, _snapshot: &WidgetSnapshot) -> anyhow::Result<()> {
    Ok(())
}
