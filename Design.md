## 给 Codex 的完整开发说明

请开发一个轻量级 Windows 桌面待办 widget，项目名为：

```text
ms-todo-desktop-widget
```

技术栈：

```text
Tauri v2
React
TypeScript
Vite
Rust backend
SQLite 本地缓存
Microsoft Graph To Do API
```

目标平台先只考虑：

```text
Windows 10 / Windows 11
```

不要做成 Windows 11 Widget Board 插件。要做成一个 Tauri 桌面应用：无边框、小尺寸、半透明、圆角、可拖动、可开机自启、可设置置顶，视觉上像桌面 widget。

---

## 产品定位

这个软件不是 Microsoft To Do 的完整替代品，而是 Microsoft To Do 的桌面暴露层。

核心目标：

```text
1. 桌面上一眼看到今天任务
2. 一键新增任务
3. 一键勾选完成任务
4. 自动同步到 Microsoft To Do
5. 手机端继续使用 Microsoft To Do Android widget
```

不要实现这些功能：

```text
Notion 同步
日历视图
番茄钟
AI 总结
复杂标签系统
甘特图
项目管理
多账号
团队协作
插件系统
皮肤市场
```

第一版只做核心功能。

---

## 任务列表设计

不要依赖 Microsoft To Do 的 My Day。Graph To Do API 的稳定模型是 task list 和 task，任务列表可以跨 To Do 客户端访问。([Microsoft Learn][1])

应用启动后检查 Microsoft To Do 中是否存在以下普通列表：

```text
Today
Inbox
This Week
```

如果不存在，自动创建。

桌面 widget 默认显示：

```text
Today
```

快速添加默认添加到：

```text
Inbox
```

用户在 Android 手机上也可以把 Microsoft To Do widget 设置为显示 `Today` 列表，实现手机桌面和 Windows 桌面看到同一组任务。

---

## MVP 功能

必须实现：

```text
1. Microsoft 登录
2. 获取 Microsoft Graph access token
3. 自动发现或创建 Today / Inbox / This Week 三个 To Do 列表
4. 显示 Today 列表中未完成任务
5. 输入框回车添加任务到 Today
6. 快捷键 Ctrl + Alt + T 呼出快速添加框，默认添加到 Inbox
7. 点击 checkbox 将任务状态更新为 completed
8. 手动刷新按钮
9. 每 3 分钟自动同步
10. 本地 SQLite 缓存，网络慢时 UI 不阻塞
11. 托盘图标：显示、隐藏、刷新、退出
12. 记住窗口位置、大小、透明度、置顶状态
```

可以做，但不是第一优先级：

```text
1. 拖拽调整任务顺序
2. 任务编辑
3. 删除任务
4. dueDate
5. reminder
```

第一版可以不做 dueDate/reminder，因为 Android 端和官方 To Do 客户端仍可处理这些细节。

---

## 认证方案

使用 Microsoft identity platform 的 OAuth 2.0 Device Code Flow。

原因：Tauri 桌面端实现简单，不需要本地 callback server，不需要 deep link。Microsoft 官方文档说明 device authorization grant 允许用户在浏览器中访问页面完成登录，登录后应用可以获取 access token 和 refresh token。([Microsoft Learn][3])

实现方式：

```text
1. Rust 后端向 Microsoft devicecode endpoint 请求 device_code
2. 前端显示 user_code 和 verification_uri
3. 自动打开浏览器
4. Rust 后端轮询 token endpoint
5. 成功后保存 refresh_token
6. 后续自动刷新 access_token
```

环境变量或配置文件：

```env
MICROSOFT_CLIENT_ID=你的 Azure App Registration Client ID
MICROSOFT_TENANT=consumers
```

默认使用：

```text
tenant = consumers
```

如果需要同时支持个人账号和工作/学校账号，可允许用户改成：

```text
common
```

OAuth scopes：

```text
User.Read
Tasks.ReadWrite
offline_access
```

注意：不要在代码中写 client secret。桌面应用是 public client，不需要 client secret。

---

## Microsoft Graph API

Graph base URL：

```text
https://graph.microsoft.com/v1.0
```

列出 task lists：

```http
GET /me/todo/lists
```

列出某个列表下的任务：

```http
GET /me/todo/lists/{todoTaskListId}/tasks
```

Graph 官方文档列出的 list tasks endpoint 是：

```http
GET /me/todo/lists/{todoTaskListId}/tasks
```

并要求 `Authorization: Bearer {token}`。([Microsoft Learn][4])

创建任务：

```http
POST /me/todo/lists/{todoTaskListId}/tasks
Content-Type: application/json

{
  "title": "任务标题"
}
```

Graph 官方文档说明该接口用于在指定 todoTaskList 中创建新的 todoTask。([Microsoft Learn][5])

完成任务：

```http
PATCH /me/todo/lists/{todoTaskListId}/tasks/{taskId}
Content-Type: application/json

{
  "status": "completed"
}
```

拉取任务时只显示：

```text
status != completed
```

---

## 数据同步策略

不要让 UI 每次直接请求 Graph。使用本地缓存。

架构：

```text
React UI
  ↓ invoke
Tauri Rust commands
  ↓
SQLite cache
  ↓
SyncService
  ↓
Microsoft Graph API
```

用户操作必须本地优先：

新增任务：

```text
1. 用户输入标题并回车
2. 立即在 SQLite 中创建一条 local task
3. UI 立即显示
4. 写入 pending_ops
5. 后台调用 Graph POST 创建任务
6. 成功后用 Graph 返回的 task id 替换 local id
7. 失败则保留 pending_ops，下次重试
```

完成任务：

```text
1. 用户点击 checkbox
2. SQLite 立即将任务标记为 completed
3. UI 立即隐藏或淡出
4. 写入 pending_ops
5. 后台调用 Graph PATCH status=completed
6. 失败则保留 pending_ops，下次重试
```

自动同步：

```text
1. 先 flush pending_ops
2. 再从 Graph 拉取 Today / Inbox / This Week 三个列表
3. 更新 SQLite
4. 通知前端刷新
```

同步间隔：

```text
3 minutes
```

手动刷新按钮立即触发一次 sync。

---

## SQLite schema

使用 `rusqlite` 或 `sqlx`。轻量起见，优先 `rusqlite`。

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_lists (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  graph_id TEXT UNIQUE,
  list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  importance TEXT,
  created_at TEXT,
  modified_at TEXT,
  local_created_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0,
  pending_delete INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pending_ops (
  op_id TEXT PRIMARY KEY,
  op_type TEXT NOT NULL,
  task_id TEXT,
  list_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
```

`role` 可取：

```text
today
inbox
this_week
```

`status` 可取：

```text
notStarted
completed
```

第一版不需要实现更多 status。

---

## Tauri 窗口设计

使用 Tauri v2。

窗口配置建议：

```json
{
  "label": "main",
  "title": "Todo Widget",
  "width": 340,
  "height": 560,
  "minWidth": 300,
  "minHeight": 360,
  "resizable": true,
  "decorations": false,
  "transparent": true,
  "shadow": true,
  "skipTaskbar": true,
  "alwaysOnTop": false,
  "visible": true
}
```

Tauri 配置文档中，`alwaysOnTop` 表示窗口是否总在其他窗口之上，`alwaysOnBottom` 表示是否总在其他窗口之下，`transparent` 表示窗口透明，`skipTaskbar` 表示在 Windows/Linux 上隐藏任务栏图标。([Tauri][2])

第一版不要挂 WorkerW / Progman 桌面层。先用普通无边框窗口 + 可选置顶。

实现三个窗口模式：

```text
Normal：普通浮窗
Pinned：alwaysOnTop = true
Hidden：隐藏到托盘
```

后续再考虑 Desktop-like 模式。

---

## UI 设计要求

风格：轻量、干净、半透明、现代，但不要花哨。

视觉关键词：

```text
Fluent-ish
glass card
soft shadow
rounded corners
compact spacing
focus on readability
```

主窗口布局：

```text
┌──────────────────────────────┐
│ Today                  ⟳  ⚙  │
│ ──────────────────────────── │
│ + Add a task...              │
│                              │
│ □ 检查 WI2015 波段提示词      │
│ □ 改 Graph API 同步逻辑       │
│ □ 看物理 10.40 第二问         │
│                              │
│ Inbox: 3        Synced 14:30 │
└──────────────────────────────┘
```

UI 元素：

```text
顶部栏：
- 标题 Today
- 刷新按钮
- 设置按钮
- 可拖动区域

输入框：
- placeholder: Add a task...
- Enter 添加到 Today
- Ctrl+Enter 添加到 Inbox
- Esc 清空/失焦

任务项：
- checkbox
- title
- hover 时显示更多按钮
- 点击 checkbox 完成
- 完成后淡出

底部栏：
- Inbox 数量
- Last synced 时间
- 网络/同步状态
```

颜色建议：

```text
背景：rgba(245, 247, 250, 0.78)
边框：rgba(255, 255, 255, 0.55)
文字主色：#1f2937
文字弱色：#6b7280
强调色：#2563eb
危险色：#dc2626
成功色：#16a34a
```

深色模式也做一下，但不用复杂：

```text
背景：rgba(17, 24, 39, 0.78)
文字主色：#f9fafb
文字弱色：#9ca3af
边框：rgba(255, 255, 255, 0.10)
```

CSS 要求：

```text
使用 CSS variables
不要引入大型 UI 库
可以使用 lucide-react 图标
不要使用 Tailwind，除非已有模板非常顺手
```

推荐依赖：

```json
{
  "lucide-react": "latest",
  "date-fns": "latest",
  "clsx": "latest"
}
```

---

## 前端组件结构

```text
src/
  main.tsx
  App.tsx
  styles.css

  components/
    WidgetShell.tsx
    TitleBar.tsx
    TaskInput.tsx
    TaskList.tsx
    TaskItem.tsx
    FooterStatus.tsx
    SettingsPanel.tsx
    QuickAddOverlay.tsx

  lib/
    api.ts
    types.ts
    format.ts
```

核心类型：

```ts
export type Task = {
  id: string;
  graphId?: string;
  listId: string;
  title: string;
  status: "notStarted" | "completed";
  importance?: "low" | "normal" | "high";
  createdAt?: string;
  modifiedAt?: string;
  dirty?: boolean;
};

export type SyncStatus = {
  state: "idle" | "syncing" | "error" | "offline";
  lastSyncedAt?: string;
  message?: string;
};
```

前端通过 Tauri `invoke` 调 Rust command：

```ts
invoke("get_today_tasks");
invoke("add_task", { title, listRole: "today" });
invoke("complete_task", { taskId });
invoke("sync_now");
invoke("login");
invoke("logout");
invoke("get_sync_status");
invoke("set_window_mode", { mode: "normal" | "pinned" });
```

---

## Rust 后端模块结构

```text
src-tauri/src/
  main.rs
  commands.rs
  auth.rs
  graph.rs
  db.rs
  sync.rs
  models.rs
  settings.rs
  tray.rs
  hotkey.rs
```

职责：

```text
auth.rs
- start_device_login()
- poll_token()
- refresh_access_token()
- store_token()
- load_token()

graph.rs
- graph_get()
- graph_post()
- graph_patch()
- list_task_lists()
- create_task_list()
- list_tasks()
- create_task()
- complete_task()

db.rs
- init_db()
- upsert_task_list()
- upsert_task()
- list_today_tasks()
- insert_pending_op()
- pop_pending_ops()
- mark_op_done()

sync.rs
- ensure_core_lists()
- flush_pending_ops()
- pull_remote_tasks()
- sync_now()

commands.rs
- 暴露给前端的 Tauri commands

tray.rs
- 托盘菜单：Show / Hide / Refresh / Pin / Exit

hotkey.rs
- Ctrl + Alt + T 快速添加
```

Rust 依赖建议：

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["full"] }
rusqlite = { version = "0.32", features = ["bundled"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
keyring = "3"
anyhow = "1"
thiserror = "1"
```

---

## 认证细节

实现 device code flow。

Device code request：

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
scope=User.Read Tasks.ReadWrite offline_access
```

Token polling：

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code
client_id={client_id}
device_code={device_code}
```

Refresh token：

```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
client_id={client_id}
refresh_token={refresh_token}
scope=User.Read Tasks.ReadWrite offline_access
```

token 存储：

```text
使用 keyring crate 存 refresh_token
不要存 localStorage
不要把 token 暴露给前端
前端只知道 logged_in / not_logged_in
```

---

## 任务操作细节

`add_task(title, listRole)`：

```text
1. 查询 role 对应 list_id
2. 生成 local task id
3. SQLite 插入 task，dirty=1
4. 插入 pending_ops: create_task
5. 立即返回 task 给前端
6. 后台触发 flush_pending_ops
```

`complete_task(taskId)`：

```text
1. SQLite status=completed, dirty=1
2. 插入 pending_ops: complete_task
3. 立即返回 OK
4. 后台触发 flush_pending_ops
```

`sync_now()`：

```text
1. 如果没登录，返回 auth_required
2. refresh access token if needed
3. ensure_core_lists()
4. flush_pending_ops()
5. pull Today / Inbox / This Week
6. 更新 last_synced_at
```

---

## 错误处理

前端不要弹大量错误框。只在底部状态显示。

错误类型：

```text
auth_required：显示 Login 按钮
network_error：底部显示 Offline / retrying
rate_limited：底部显示 Waiting
graph_error：底部显示 Sync failed
```

任务操作失败时不要马上回滚 UI。保留 pending_ops，下一轮重试。

---

## 设置页

第一版设置项：

```text
1. 登录 / 退出登录
2. 当前账号显示
3. 窗口置顶开关
4. 透明度 slider，范围 70–100%
5. 自动同步间隔，默认 3 min
6. 开机自启开关
7. 手动重新创建核心列表
```

不要做复杂设置。

---

## 快捷键

实现：

```text
Ctrl + Alt + T
```

行为：

```text
打开 QuickAddOverlay
输入任务
Enter 添加到 Inbox
Ctrl + Enter 添加到 Today
Esc 关闭
```

QuickAddOverlay 应该比主窗口更小：

```text
宽 420
高 72
居中显示
```

---

## 托盘

托盘菜单：

```text
Show Widget
Hide Widget
Pin / Unpin
Sync Now
Settings
Quit
```

点击托盘图标：

```text
显示/隐藏主窗口
```

---

## 开机自启

第一版可以先写为 TODO，或者用 Tauri autostart plugin。

如果加插件，保持简单：

```text
设置页有开机自启开关
默认关闭
```

---

## 开发步骤

请严格按下面顺序实现，不要先做美化。

第一步：创建 Tauri + React + TypeScript 项目。

```bash
npm create tauri-app@latest ms-todo-desktop-widget
```

选择：

```text
React
TypeScript
Vite
```

第二步：完成静态 UI。

先用 mock tasks，不接 API。实现：

```text
WidgetShell
TitleBar
TaskInput
TaskList
TaskItem
FooterStatus
```

第三步：实现 SQLite。

完成：

```text
init_db
insert mock tasks
get_today_tasks
add_task local
complete_task local
```

第四步：实现 Microsoft 登录。

完成 device code flow：

```text
login command
显示 user_code
打开 verification_uri
轮询 token
keyring 保存 refresh_token
```

第五步：实现 Graph To Do API。

完成：

```text
list_task_lists
create_task_list
list_tasks
create_task
complete_task
```

第六步：实现同步。

完成：

```text
ensure_core_lists
sync_now
flush_pending_ops
pull_remote_tasks
```

第七步：实现托盘、快捷键、窗口设置。

第八步：优化 UI 细节。

---

## 验收标准

本地运行后必须满足：

```text
1. 首次打开显示登录界面
2. 点击登录后，浏览器打开 Microsoft 登录页面
3. 登录成功后，应用自动创建或识别 Today / Inbox / This Week
4. 主窗口显示 Today 未完成任务
5. 输入框回车可以新增任务，并能在官方 Microsoft To Do 中看到
6. 点击 checkbox 后任务完成，并能在官方 Microsoft To Do 中同步为 completed
7. 关闭主窗口后应用仍在托盘
8. Ctrl + Alt + T 可以快速添加任务到 Inbox
9. 重启应用后仍保持登录状态、窗口位置和缓存任务
10. 网络断开时仍能本地添加/完成，恢复网络后同步
```

---

## README 要写清楚

README 包含：

```text
1. 项目用途
2. 不是完整 To Do 客户端，只是桌面 widget
3. Azure App Registration 设置方法
4. 需要的 Graph delegated permissions:
   - User.Read
   - Tasks.ReadWrite
   - offline_access
5. 如何运行
6. 如何构建
7. 数据存储位置
8. token 安全说明
```

运行命令：

```bash
npm install
npm run tauri dev
```

构建命令：

```bash
npm run tauri build
```

---

## 最终效果要求

最终产品应该像这样：

```text
一个 340×560 的半透明圆角桌面面板
上方是 Today
中间是任务列表
每条任务左侧 checkbox
顶部输入框可直接添加
底部显示 Inbox 数量和同步状态
托盘常驻
支持 Ctrl + Alt + T 快速添加
```

它必须克制。不要把它做成第二个 Notion。它只负责一件事：**让 Microsoft To Do 的今日任务长期暴露在 Windows 桌面上，并且能一键新增、一键完成。**

[1]: https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0 "Use the Microsoft To Do API - Microsoft Graph v1.0 | Microsoft Learn"
[2]: https://v2.tauri.app/reference/config/ "Configuration | Tauri"
[3]: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code "OAuth 2.0 device authorization grant - Microsoft identity platform | Microsoft Learn"
[4]: https://learn.microsoft.com/en-us/graph/api/todotasklist-list-tasks?view=graph-rest-1.0 "List Todo tasks - Microsoft Graph v1.0 | Microsoft Learn"
[5]: https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks?view=graph-rest-1.0 "Create todoTask - Microsoft Graph v1.0 | Microsoft Learn"
