import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { api } from "./lib/api";
import type { AuthStatus, ListRole, Settings, SortMode, SyncStatus, Task, TaskList as TodoList, TaskPatch } from "./lib/types";
import { WidgetShell } from "./components/WidgetShell";
import { TitleBar } from "./components/TitleBar";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { FooterStatus } from "./components/FooterStatus";
import { SettingsPanel } from "./components/SettingsPanel";
import { QuickAddOverlay } from "./components/QuickAddOverlay";
import { TaskDetailsPanel } from "./components/TaskDetailsPanel";
import { WidgetContextMenu } from "./components/WidgetContextMenu";
import { compareTaskDueDates } from "./lib/dates";

const defaultStatus: SyncStatus = { state: "idle" };
const defaultSettings: Settings = {
  alwaysOnTop: false,
  opacity: 0.78,
  syncIntervalMinutes: 3,
  autostart: false,
  debugMode: false,
  showCompleted: false,
  fontFamily: "system",
  fontScale: 1,
};

export default function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const route = getRoute();
  const view = route.get("view");
  const taskId = route.get("taskId");

  useEffect(() => {
    try {
      setWindowLabel(getCurrentWindow().label);
    } catch {
      setWindowLabel(view === "details" ? "task-details-preview" : "main");
    }
  }, []);

  if (view === "details" || windowLabel?.startsWith("task-details-")) {
    return <TaskDetailsWindow taskId={taskId} windowLabel={windowLabel} />;
  }

  if (windowLabel === null) {
    return null;
  }

  return <WidgetApp />;
}

function WidgetApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const selectedListIdRef = useRef<string | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(defaultStatus);
  const [auth, setAuth] = useState<AuthStatus>({ loggedIn: false });
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode());
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const [completingIds, setCompletingIds] = useState<Set<string>>(() => new Set());

  const visibleTasks = useMemo(
    () => sortTasks(tasks.filter((task) => settings.showCompleted || task.status !== "completed"), sortMode),
    [settings.showCompleted, sortMode, tasks],
  );
  const selectedList = useMemo(
    () => taskLists.find((list) => list.id === selectedListId) || null,
    [selectedListId, taskLists],
  );

  const refreshLocal = useCallback(async (preferredListId?: string | null) => {
    const [nextLists, nextStatus, nextInboxCount, nextAuth, nextSettings] = await Promise.all([
      api.getTaskLists(),
      api.getSyncStatus(),
      api.getInboxCount(),
      api.getAuthStatus(),
      api.getSettings(),
    ]);

    const currentListId = preferredListId !== undefined ? preferredListId : selectedListIdRef.current;
    const nextSelectedListId =
      (currentListId && nextLists.some((list) => list.id === currentListId) && currentListId) ||
      nextLists.find((list) => list.role === "today")?.id ||
      nextLists[0]?.id ||
      null;

    const nextTasks = nextSelectedListId
      ? await api.getTasksForList(nextSelectedListId)
      : await api.getTodayTasks();

    setTaskLists(nextLists);
    selectedListIdRef.current = nextSelectedListId;
    setSelectedListId(nextSelectedListId);
    setTasks(nextTasks);
    setSyncStatus(nextStatus);
    setInboxCount(nextInboxCount);
    setAuth(nextAuth);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("task-updated", () => void refreshLocal()).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });
    return () => unlisten?.();
  }, [refreshLocal]);

  useEffect(() => {
    const interval = window.setInterval(
      () => void handleSync(),
      Math.max(1, settings.syncIntervalMinutes) * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, [settings.syncIntervalMinutes]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
      const menuWidth = 166;
      const menuHeight = 176;
      setContextMenu({
        open: true,
        x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
        y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu((current) => ({ ...current, open: false }));
      }
    }

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!loginNotice || auth.loggedIn) return;

    const interval = window.setInterval(() => void refreshLocal(), 1500);
    return () => window.clearInterval(interval);
  }, [auth.loggedIn, loginNotice, refreshLocal]);

  useEffect(() => {
    if (auth.loggedIn && loginNotice) {
      setLoginNotice(null);
      void handleSync();
    }
  }, [auth.loggedIn, loginNotice]);

  async function handleAdd(title: string, listRole: ListRole) {
    const currentListId = selectedListIdRef.current;
    const task =
      listRole === "inbox" || !currentListId
        ? await api.addTask(title, listRole)
        : await api.addTaskToList(title, currentListId);

    if (task.listId === currentListId || listRole === "today") {
      setTasks((current) => [task, ...current]);
    }
    setSyncStatus((current) => ({ ...current, state: "syncing", message: "Uploading task" }));
    try {
      const syncTarget = currentListId || task.listId;
      const nextStatus = syncTarget && !syncTarget.startsWith("local-")
        ? await api.syncListNow(syncTarget)
        : await api.syncNow();
      setSyncStatus(nextStatus);
    } catch (error) {
      setSyncStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await refreshLocal(currentListId);
  }

  async function handleComplete(taskId: string) {
    setCompletingIds((current) => new Set(current).add(taskId));
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: "completed", dirty: true } : task)),
    );

    try {
      await api.completeTask(taskId);
      await refreshLocal();
    } finally {
      setCompletingIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleSync() {
    setSyncStatus((current) => ({ ...current, state: "syncing", message: "Syncing" }));
    try {
      const currentListId = selectedListIdRef.current;
      const nextStatus = currentListId ? await api.syncListNow(currentListId) : await api.syncNow();
      setSyncStatus(nextStatus);
      await refreshLocal(currentListId);
    } catch (error) {
      setSyncStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleLogin() {
    setLoginNotice("Opening Microsoft sign-in");
    try {
      const login = await api.login();
      setLoginNotice(login.message);
      setSyncStatus({
        state: "auth_required",
        message: "Waiting for Microsoft login",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoginNotice(message);
      setSyncStatus({
        state: "auth_required",
        message,
      });
    }
  }

  async function handleSettingsChange(next: Partial<Settings>) {
    const updated = await api.updateSettings(next);
    setSettings(updated);
    if (next.alwaysOnTop !== undefined) {
      await api.setWindowMode(next.alwaysOnTop ? "pinned" : "normal");
    }
  }

  async function hideWindow() {
    await api.setWindowMode("hidden");
  }

  return (
    <WidgetShell opacity={settings.opacity} fontFamily={settings.fontFamily} fontScale={settings.fontScale}>
      <TitleBar
        isPinned={settings.alwaysOnTop}
        taskLists={taskLists}
        selectedListId={selectedListId}
        sortMode={sortMode}
        syncStatus={syncStatus}
        onDragStart={() => void api.startDrag()}
        onSelectList={(listId) => {
          selectedListIdRef.current = listId;
          setSelectedListId(listId);
          void api.getTasksForList(listId).then(setTasks);
        }}
        onSelectSort={(nextSortMode) => {
          setSortMode(nextSortMode);
          window.localStorage.setItem("todo-sort-mode", nextSortMode);
        }}
        onRefresh={handleSync}
        onTogglePinned={() => void handleSettingsChange({ alwaysOnTop: !settings.alwaysOnTop })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <TaskInput onAdd={handleAdd} />
      <TaskList
        tasks={visibleTasks}
        listName={selectedList?.displayName}
        completingIds={completingIds}
        onComplete={handleComplete}
        onOpenDetails={(task) => void api.openTaskDetails(task.id)}
      />
      <FooterStatus inboxCount={inboxCount} syncStatus={syncStatus} />

      <SettingsPanel
        open={settingsOpen}
        auth={auth}
        settings={settings}
        loginNotice={loginNotice}
        onClose={() => setSettingsOpen(false)}
        onLogin={() => void handleLogin()}
        onLogout={() => void api.logout().then(() => refreshLocal())}
        onChange={(next) => void handleSettingsChange(next)}
        onEnsureLists={() => void handleSync()}
      />

      <WidgetContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        isPinned={settings.alwaysOnTop}
        onClose={() => setContextMenu((current) => ({ ...current, open: false }))}
        onRefresh={() => void handleSync()}
        onTogglePinned={() => void handleSettingsChange({ alwaysOnTop: !settings.alwaysOnTop })}
        onOpenSettings={() => setSettingsOpen(true)}
        onHide={() => void hideWindow()}
      />

      <QuickAddOverlay open={quickAddOpen} onAdd={handleAdd} onClose={() => setQuickAddOpen(false)} />
    </WidgetShell>
  );
}

function getRoute() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (hash.startsWith("details")) {
    const [, query = ""] = hash.split("?");
    const hashParams = new URLSearchParams(query);
    hashParams.set("view", "details");
    return hashParams;
  }
  return params;
}

function readSortMode(): SortMode {
  const value = window.localStorage.getItem("todo-sort-mode");
  if (
    value === "due" ||
    value === "created" ||
    value === "modified" ||
    value === "importance" ||
    value === "title" ||
    value === "reminder"
  ) {
    return value;
  }
  return "default";
}

function sortTasks(tasks: Task[], sortMode: SortMode) {
  const next = [...tasks];
  next.sort((a, b) => {
    const statusOrder = completedRank(a) - completedRank(b);
    if (statusOrder !== 0) return statusOrder;

    if (a.status === "completed" && b.status === "completed") {
      return compareOptionalDateDesc(a.completedDateTime || a.modifiedAt, b.completedDateTime || b.modifiedAt);
    }

    if (sortMode === "title") return a.title.localeCompare(b.title);
    if (sortMode === "importance") return importanceRank(b) - importanceRank(a) || fallbackOrder(a, b);
    if (sortMode === "created") return compareOptionalDateDesc(a.createdAt, b.createdAt) || compareTaskDueDates(a, b);
    if (sortMode === "modified") return compareOptionalDateDesc(a.modifiedAt, b.modifiedAt) || compareTaskDueDates(a, b);
    if (sortMode === "reminder") return compareOptionalDate(a.reminderDateTime, b.reminderDateTime) || compareTaskDueDates(a, b);

    if (sortMode === "due" || sortMode === "default") {
      return compareTaskDueDates(a, b) || fallbackOrder(a, b);
    }

    return 0;
  });

  return next;
}

function completedRank(task: Task) {
  return task.status === "completed" ? 1 : 0;
}

function importanceRank(task: Task) {
  if (task.importance === "high") return 3;
  if (task.importance === "normal" || !task.importance) return 2;
  return 1;
}

function compareOptionalDate(left?: string | null, right?: string | null) {
  const leftTime = parseOptionalDate(left);
  const rightTime = parseOptionalDate(right);
  return leftTime - rightTime;
}

function compareOptionalDateDesc(left?: string | null, right?: string | null) {
  const leftTime = parseOptionalDate(left);
  const rightTime = parseOptionalDate(right);
  if (leftTime === Number.POSITIVE_INFINITY && rightTime === Number.POSITIVE_INFINITY) return 0;
  if (leftTime === Number.POSITIVE_INFINITY) return 1;
  if (rightTime === Number.POSITIVE_INFINITY) return -1;
  return rightTime - leftTime;
}

function parseOptionalDate(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function fallbackOrder(a: Task, b: Task) {
  return compareOptionalDateDesc(a.modifiedAt || a.createdAt, b.modifiedAt || b.createdAt);
}

function TaskDetailsWindow({ taskId, windowLabel }: { taskId: string | null; windowLabel: string | null }) {
  const [resolvedTaskId, setResolvedTaskId] = useState<string | null>(taskId);
  const [task, setTask] = useState<Task | null>(null);
  const [taskLists, setTaskLists] = useState<TodoList[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskList = taskLists.find((list) => list.id === task?.listId);

  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    if (taskId) {
      setResolvedTaskId(taskId);
      return;
    }

    if (!windowLabel) return;

    void api
      .getTaskIdForWindow(windowLabel)
      .then((nextTaskId) => {
        if (nextTaskId) {
          setResolvedTaskId(nextTaskId);
          setError(null);
        } else {
          setError("Task details could not be resolved for this window.");
        }
      })
      .catch((resolveError) => {
        setError(resolveError instanceof Error ? resolveError.message : String(resolveError));
      });
  }, [taskId, windowLabel]);

  const load = useCallback(async () => {
    if (!resolvedTaskId) return;
    try {
      const [nextTask, nextLists, nextSettings] = await Promise.all([
        api.getTask(resolvedTaskId),
        api.getTaskLists(),
        api.getSettings(),
      ]);
      setTask(nextTask);
      setTaskLists(nextLists);
      setSettings(nextSettings);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }, [resolvedTaskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(nextTaskId: string, patch: TaskPatch) {
    setSaving(true);
    try {
      const updated = await api.updateTask(nextTaskId, patch);
      setTask(updated);
      const syncTarget = updated.listId;
      if (syncTarget && !syncTarget.startsWith("local-")) {
        await api.syncListNow(syncTarget);
      } else {
        await api.syncNow();
      }
      await load();
      await emit("task-updated", { taskId: nextTaskId });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  function closeWindow() {
    const label = windowLabel || getCurrentWindow().label;
    void api.closeTaskDetailsWindow(label).catch(() => getCurrentWindow().close());
  }

  return (
    <main
      className="details-window"
      data-font={settings.fontFamily}
      style={{ "--font-scale": settings.fontScale } as CSSProperties}
    >
      {task ? (
        <TaskDetailsPanel
          task={task}
          taskList={taskList}
          saving={saving}
          windowed
          onClose={closeWindow}
          onSave={handleSave}
        />
      ) : (
        <div className="details-loading">
          <span>{error || "Loading task..."}</span>
        </div>
      )}
      {error && task ? <div className="details-error">{error}</div> : null}
    </main>
  );
}
