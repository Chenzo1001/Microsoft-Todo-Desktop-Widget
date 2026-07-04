export type ListRole = "today" | "inbox" | "this_week";
export type SortMode = "default" | "due" | "created" | "modified" | "importance" | "title" | "reminder";
export type LanguageSetting = "system" | "en" | "zh-CN";

export type Task = {
  id: string;
  graphId?: string | null;
  listId: string;
  title: string;
  status: "notStarted" | "completed";
  importance?: "low" | "normal" | "high" | null;
  note?: string | null;
  dueDateTime?: string | null;
  reminderDateTime?: string | null;
  completedDateTime?: string | null;
  timeZone?: string | null;
  isReminderOn?: boolean;
  recurrence?: Recurrence | null;
  createdAt?: string | null;
  modifiedAt?: string | null;
  dirty?: boolean;
};

export type RecurrenceMode = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type Recurrence = {
  pattern?: {
    type?: string;
    interval?: number;
    daysOfWeek?: string[];
    firstDayOfWeek?: string;
    dayOfMonth?: number;
    month?: number;
  };
  range?: {
    type?: string;
    startDate?: string;
  };
};

export type TaskPatch = {
  title: string;
  importance?: "low" | "normal" | "high" | null;
  note?: string | null;
  dueDateTime?: string | null;
  reminderDateTime?: string | null;
  timeZone?: string | null;
  isReminderOn: boolean;
  recurrence?: Recurrence | null;
};

export type TaskList = {
  id: string;
  displayName: string;
  role?: ListRole | null;
};

export type SyncStatus = {
  state: "idle" | "syncing" | "error" | "offline" | "auth_required";
  lastSyncedAt?: string | null;
  message?: string | null;
};

export type Settings = {
  alwaysOnTop: boolean;
  opacity: number;
  syncIntervalMinutes: number;
  autostart: boolean;
  debugMode: boolean;
  showCompleted: boolean;
  language: LanguageSetting;
  fontFamily: "system" | "compact" | "serif" | "mono";
  fontScale: number;
};

export type AuthStatus = {
  loggedIn: boolean;
  account?: string | null;
};

export type LoginStart = {
  authUrl: string;
  message: string;
};
