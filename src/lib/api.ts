import { invoke } from "@tauri-apps/api/core";
import type { AuthStatus, ListRole, LoginStart, Settings, SyncStatus, Task, TaskList, TaskPatch } from "./types";

let mockTasks: Task[] = [
  {
    id: "mock-1",
    listId: "today",
    title: "Connect Microsoft Graph client id",
    status: "notStarted",
    dirty: false,
  },
  {
    id: "mock-2",
    listId: "today",
    title: "Check local SQLite cache path",
    status: "notStarted",
    dirty: false,
  },
];

let mockLists: TaskList[] = [
  { id: "today", displayName: "Today", role: "today" },
  { id: "inbox", displayName: "Inbox", role: "inbox" },
];

let mockSettings: Settings = {
  alwaysOnTop: false,
  opacity: 0.78,
  syncIntervalMinutes: 3,
  autostart: false,
  debugMode: false,
  showCompleted: false,
  language: "system",
  fontFamily: "system",
  fontScale: 1,
};

async function call<T>(command: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    if (fallback !== undefined && isNonTauriError(error)) return fallback;
    throw error;
  }
}

function isNonTauriError(error: unknown) {
  const message = String(error);
  return (
    message.includes("Cannot read properties of undefined") ||
    message.includes("__TAURI_INTERNALS__") ||
    message.includes("not available") ||
    message.includes("is not a function")
  );
}

export const api = {
  getTodayTasks: () => call<Task[]>("get_today_tasks", undefined, mockTasks),
  getTaskLists: () => call<TaskList[]>("get_task_lists", undefined, mockLists),
  getTask: (taskId: string) =>
    call<Task>(
      "get_task",
      { taskId },
      mockTasks.find((task) => task.id === taskId) || mockTasks[0],
    ),
  getTaskIdForWindow: (label: string) => call<string | null>("get_task_id_for_window", { label }, null),
  getTasksForList: (listId: string) =>
    call<Task[]>(
      "get_tasks_for_list",
      { listId },
      mockTasks.filter((task) => task.listId === listId),
    ),
  addTaskToList: async (title: string, listId: string) => {
    try {
      return await invoke<Task>("add_task_to_list", { title, listId });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
      const task: Task = {
        id: `mock-${Date.now()}`,
        listId,
        title,
        status: "notStarted",
        dirty: true,
      };
      mockTasks = [task, ...mockTasks];
      return task;
    }
  },
  addTask: async (title: string, listRole: ListRole) => {
    try {
      return await invoke<Task>("add_task", { title, listRole });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
      const task: Task = {
        id: `mock-${Date.now()}`,
        listId: listRole,
        title,
        status: "notStarted",
        dirty: true,
      };
      if (listRole === "today") mockTasks = [task, ...mockTasks];
      return task;
    }
  },
  completeTask: async (taskId: string) => {
    try {
      return await invoke<void>("complete_task", { taskId });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
      mockTasks = mockTasks.map((task) =>
        task.id === taskId ? { ...task, status: "completed", dirty: true } : task,
      );
      return;
    }
  },
  updateTask: async (taskId: string, patch: TaskPatch) => {
    try {
      return await invoke<Task>("update_task", { taskId, patch });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
      const task = mockTasks.find((item) => item.id === taskId);
      if (!task) throw error;
      const updated = { ...task, ...patch, dirty: true };
      mockTasks = mockTasks.map((item) => (item.id === taskId ? updated : item));
      return updated;
    }
  },
  openTaskDetails: async (taskId: string) => {
    try {
      await invoke<void>("open_task_details", { taskId });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
  closeTaskDetailsWindow: async (label: string) => {
    try {
      await invoke<void>("close_task_details_window", { label });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
  syncNow: () => call<SyncStatus>("sync_now", undefined, { state: "auth_required", message: "Run inside Tauri to sync" }),
  syncListNow: (listId: string) =>
    call<SyncStatus>("sync_list_now", { listId }, { state: "auth_required", message: "Run inside Tauri to sync" }),
  getSyncStatus: () =>
    call<SyncStatus>("get_sync_status", undefined, {
      state: "auth_required",
      message: "Run inside Tauri to connect Microsoft To Do",
    }),
  login: () =>
    call<LoginStart>("login", undefined, {
      authUrl: "https://login.microsoftonline.com/",
      message: "Run inside Tauri to start Microsoft login",
    }),
  logout: async () => {
    try {
      await invoke<void>("logout");
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
  getAuthStatus: () => call<AuthStatus>("get_auth_status", undefined, { loggedIn: false }),
  getInboxCount: () => call<number>("get_inbox_count", undefined, 0),
  getSettings: () =>
    call<Settings>("get_settings", undefined, mockSettings),
  updateSettings: async (settings: Partial<Settings>) => {
    try {
      return await invoke<Settings>("update_settings", { settings });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
      mockSettings = { ...mockSettings, ...settings };
      return mockSettings;
    }
  },
  setWindowMode: async (mode: "normal" | "pinned" | "hidden") => {
    try {
      await invoke<void>("set_window_mode", { mode });
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
  startDrag: async () => {
    try {
      await invoke<void>("start_drag");
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
  startWindowDrag: async () => {
    try {
      await invoke<void>("start_window_drag");
    } catch (error) {
      if (!isNonTauriError(error)) throw error;
    }
  },
};
