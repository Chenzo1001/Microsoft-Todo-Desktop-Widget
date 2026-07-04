use anyhow::anyhow;
use rusqlite::{params, Connection, OptionalExtension};

use crate::{auth, db, graph, models::SyncStatusDto, widget_snapshot, AppState};

pub async fn sync_now(state: &AppState) -> SyncStatusDto {
    let previous_last_synced = state
        .db
        .lock()
        .ok()
        .and_then(|conn| db::last_synced_at(&conn).ok())
        .flatten();

    let result = sync_inner(state).await;
    match result {
        Ok(last_synced_at) => SyncStatusDto {
            state: "idle".to_string(),
            last_synced_at: Some(last_synced_at),
            message: Some("Synced".to_string()),
        },
        Err(error) if error.to_string().contains("refresh token") => {
            SyncStatusDto::auth_required("Login required")
        }
        Err(error) if error.to_string().contains("MICROSOFT_CLIENT_ID") => {
            SyncStatusDto::auth_required(error.to_string())
        }
        Err(error) => SyncStatusDto::error(error.to_string(), previous_last_synced),
    }
}

pub async fn sync_list_now(state: &AppState, list_id: &str) -> SyncStatusDto {
    let previous_last_synced = state
        .db
        .lock()
        .ok()
        .and_then(|conn| db::last_synced_at(&conn).ok())
        .flatten();

    let result = sync_list_inner(state, list_id).await;
    match result {
        Ok(last_synced_at) => SyncStatusDto {
            state: "idle".to_string(),
            last_synced_at: Some(last_synced_at),
            message: Some("Synced".to_string()),
        },
        Err(error) if error.to_string().contains("refresh token") => {
            SyncStatusDto::auth_required("Login required")
        }
        Err(error) if error.to_string().contains("MICROSOFT_CLIENT_ID") => {
            SyncStatusDto::auth_required(error.to_string())
        }
        Err(error) => SyncStatusDto::error(error.to_string(), previous_last_synced),
    }
}

async fn sync_inner(state: &AppState) -> anyhow::Result<String> {
    let access_token = auth::access_token(state).await?;
    refresh_profile(state, &access_token).await;
    ensure_core_lists(state, &access_token).await?;
    flush_pending_ops(state, &access_token).await?;
    pull_remote_tasks(state, &access_token).await?;

    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    let last_synced_at = db::set_last_synced_at(&conn)?;
    let _ = widget_snapshot::export_today_with_last_synced(
        &conn,
        &state.macos_app_group_id,
        Some(last_synced_at.clone()),
    );
    Ok(last_synced_at)
}

async fn sync_list_inner(state: &AppState, list_id: &str) -> anyhow::Result<String> {
    let access_token = auth::access_token(state).await?;
    refresh_profile(state, &access_token).await;
    ensure_core_lists(state, &access_token).await?;
    flush_pending_ops(state, &access_token).await?;
    let sync_lists = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        if list_id.starts_with("local-") || !db::remote_task_list_exists(&conn, list_id)? {
            remote_lists(&conn)?
        } else {
            vec![list_id.to_string()]
        }
    };
    pull_remote_tasks_for_lists(state, &access_token, sync_lists).await?;

    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    let last_synced_at = db::set_last_synced_at(&conn)?;
    let _ = widget_snapshot::export_today_with_last_synced(
        &conn,
        &state.macos_app_group_id,
        Some(last_synced_at.clone()),
    );
    Ok(last_synced_at)
}

pub async fn ensure_core_lists(state: &AppState, access_token: &str) -> anyhow::Result<()> {
    let lists = graph::list_task_lists(&state.http, access_token).await?;
    let remote_lists = lists
        .into_iter()
        .map(|list| {
            let role = role_for_graph_list(list.wellknown_list_name.as_deref()).map(str::to_string);
            (list.id, list.display_name, role)
        })
        .collect::<Vec<_>>();

    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    db::replace_remote_task_lists(&conn, &remote_lists)?;

    Ok(())
}

async fn refresh_profile(state: &AppState, access_token: &str) {
    let Ok(profile) = graph::get_profile(&state.http, access_token).await else {
        return;
    };

    let account = profile
        .display_name
        .filter(|value| !value.trim().is_empty())
        .or(profile.mail)
        .or(profile.user_principal_name);

    if let Some(account) = account {
        if let Ok(conn) = state.db.lock() {
            let _ = db::save_auth_account(&conn, &account);
        }
    }
}

async fn pull_remote_tasks(state: &AppState, access_token: &str) -> anyhow::Result<()> {
    let lists = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        remote_lists(&conn)?
    };

    pull_remote_tasks_for_lists(state, access_token, lists).await
}

async fn pull_remote_tasks_for_lists(
    state: &AppState,
    access_token: &str,
    lists: Vec<String>,
) -> anyhow::Result<()> {
    for list_id in lists {
        let tasks = graph::list_tasks(&state.http, access_token, &list_id).await?;
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        let remote_ids = tasks.iter().map(|task| task.id.clone()).collect::<Vec<_>>();
        for task in tasks {
            db::upsert_graph_task(
                &conn,
                &list_id,
                &task.id,
                &task.title,
                task.status.as_deref().unwrap_or("notStarted"),
                task.importance.as_deref(),
                task.body.as_ref().and_then(|body| body.content.as_deref()),
                task.due_date_time
                    .as_ref()
                    .and_then(|value| value.date_time.as_deref()),
                task.reminder_date_time
                    .as_ref()
                    .and_then(|value| value.date_time.as_deref()),
                task.completed_date_time
                    .as_ref()
                    .and_then(|value| value.date_time.as_deref()),
                task.due_date_time
                    .as_ref()
                    .and_then(|value| value.time_zone.as_deref())
                    .or_else(|| {
                        task.reminder_date_time
                            .as_ref()
                            .and_then(|value| value.time_zone.as_deref())
                    }),
                task.is_reminder_on.unwrap_or(false),
                task.recurrence.as_ref(),
                task.created_date_time.as_deref(),
                task.last_modified_date_time.as_deref(),
            )?;
        }
        db::mark_missing_remote_tasks_deleted(&conn, &list_id, &remote_ids)?;
    }

    Ok(())
}

async fn flush_pending_ops(state: &AppState, access_token: &str) -> anyhow::Result<()> {
    let ops = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        pending_ops(&conn)?
    };

    let mut failures = Vec::new();

    for op in ops {
        let result = match op.op_type.as_str() {
            "create_task" => flush_create_task(state, access_token, &op).await,
            "update_task" => flush_update_task(state, access_token, &op).await,
            "complete_task" => flush_complete_task(state, access_token, &op).await,
            _ => Err(anyhow!("unknown pending op {}", op.op_type)),
        };

        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        match result {
            Ok(()) => {
                conn.execute(
                    "DELETE FROM pending_ops WHERE op_id = ?1",
                    params![op.op_id],
                )?;
            }
            Err(error) => {
                failures.push(error.to_string());
                conn.execute(
                    "UPDATE pending_ops SET retry_count = retry_count + 1, last_error = ?2 WHERE op_id = ?1",
                    params![op.op_id, error.to_string()],
                )?;
            }
        }
    }

    if !failures.is_empty() {
        return Err(anyhow!("Pending upload failed: {}", failures.join("; ")));
    }

    Ok(())
}

async fn flush_create_task(
    state: &AppState,
    access_token: &str,
    op: &PendingOp,
) -> anyhow::Result<()> {
    let task_id = op
        .task_id
        .as_deref()
        .ok_or_else(|| anyhow!("missing task id"))?;
    let (remote_list_id, local_task) = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        let list_id = remote_list_id_for_task(&conn, task_id)?;
        let task = db::get_task(&conn, task_id)?;
        (list_id, task)
    };

    let task = graph::create_task(&state.http, access_token, &remote_list_id, &local_task).await?;
    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    conn.execute(
        "UPDATE tasks SET graph_id = ?2, dirty = 0, modified_at = ?3 WHERE id = ?1",
        params![task_id, task.id, task.last_modified_date_time],
    )?;
    Ok(())
}

async fn flush_update_task(
    state: &AppState,
    access_token: &str,
    op: &PendingOp,
) -> anyhow::Result<()> {
    let task_id = op
        .task_id
        .as_deref()
        .ok_or_else(|| anyhow!("missing task id"))?;
    let (remote_list_id, graph_id, local_task) = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        let list_id = remote_list_id_for_task(&conn, task_id)?;
        let task = db::get_task(&conn, task_id)?;
        let graph_id = task
            .graph_id
            .clone()
            .ok_or_else(|| anyhow!("task has not been created remotely yet"))?;
        (list_id, graph_id, task)
    };

    let task = graph::update_task(
        &state.http,
        access_token,
        &remote_list_id,
        &graph_id,
        &local_task,
    )
    .await?;
    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    conn.execute(
        "UPDATE tasks SET dirty = 0, modified_at = ?2 WHERE id = ?1",
        params![task_id, task.last_modified_date_time],
    )?;
    Ok(())
}

async fn flush_complete_task(
    state: &AppState,
    access_token: &str,
    op: &PendingOp,
) -> anyhow::Result<()> {
    let task_id = op
        .task_id
        .as_deref()
        .ok_or_else(|| anyhow!("missing task id"))?;
    let (remote_list_id, graph_id) = {
        let conn = state
            .db
            .lock()
            .map_err(|_| anyhow!("database lock poisoned"))?;
        let list_id = remote_list_id_for_task(&conn, task_id)?;
        let graph_id = conn
            .query_row(
                "SELECT graph_id FROM tasks WHERE id = ?1",
                params![task_id],
                |row| row.get::<_, Option<String>>(0),
            )?
            .ok_or_else(|| anyhow!("task has not been created remotely yet"))?;
        (list_id, graph_id)
    };

    graph::complete_task(&state.http, access_token, &remote_list_id, &graph_id).await?;
    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    conn.execute("UPDATE tasks SET dirty = 0 WHERE id = ?1", params![task_id])?;
    Ok(())
}

fn remote_lists(conn: &Connection) -> anyhow::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT id FROM task_lists
         WHERE id NOT LIKE 'local-%'",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut lists = Vec::new();
    for row in rows {
        lists.push(row?);
    }
    Ok(lists)
}

fn role_for_graph_list(wellknown_list_name: Option<&str>) -> Option<&'static str> {
    match wellknown_list_name {
        Some("defaultList") => Some("inbox"),
        _ => None,
    }
}

fn remote_list_id_for_task(conn: &Connection, task_id: &str) -> anyhow::Result<String> {
    let local_list_id: String = conn.query_row(
        "SELECT list_id FROM tasks WHERE id = ?1",
        params![task_id],
        |row| row.get(0),
    )?;

    let role: Option<String> = conn
        .query_row(
            "SELECT role FROM task_lists WHERE id = ?1",
            params![local_list_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten();

    if let Some(role) = role {
        let remote: Option<String> = conn
            .query_row(
                "SELECT id FROM task_lists
                 WHERE role = ?1 AND id NOT LIKE 'local-%'
                 ORDER BY updated_at DESC LIMIT 1",
                params![role],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(remote) = remote {
            return Ok(remote);
        }
    }

    if local_list_id.starts_with("local-") {
        if let Some(remote) = remote_lists(conn)?.into_iter().next() {
            return Ok(remote);
        }
    }

    Ok(local_list_id)
}

#[derive(Debug)]
struct PendingOp {
    op_id: String,
    op_type: String,
    task_id: Option<String>,
}

fn pending_ops(conn: &Connection) -> anyhow::Result<Vec<PendingOp>> {
    let mut stmt = conn.prepare(
        "SELECT op_id, op_type, task_id FROM pending_ops ORDER BY created_at ASC, op_id ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(PendingOp {
            op_id: row.get(0)?,
            op_type: row.get(1)?,
            task_id: row.get(2)?,
        })
    })?;

    let mut ops = Vec::new();
    for row in rows {
        ops.push(row?);
    }
    Ok(ops)
}
