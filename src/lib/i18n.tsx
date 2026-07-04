import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

export type LanguageSetting = "system" | "en" | "zh-CN";
export type ResolvedLanguage = "en" | "zh-CN";

type I18nContextValue = {
  language: ResolvedLanguage;
  setting: LanguageSetting;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  language,
  children,
}: {
  language: LanguageSetting;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const resolved = resolveLanguage(language);
    return {
      language: resolved,
      setting: language,
      t: (key: TranslationKey, values?: Record<string, string | number>) =>
        interpolate(translations[resolved][key] || translations.en[key] || key, values),
    };
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = value.language;
  }, [value.language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context) return context;

  const language = resolveLanguage("system");
  return {
    language,
    setting: "system" as const,
    t: (key: TranslationKey, values?: Record<string, string | number>) =>
      interpolate(translations[language][key] || translations.en[key] || key, values),
  };
}

export function resolveLanguage(language: LanguageSetting): ResolvedLanguage {
  if (language === "en" || language === "zh-CN") return language;
  const browserLanguage = navigator.language.toLowerCase();
  return browserLanguage.startsWith("zh") ? "zh-CN" : "en";
}

export function localizeBackendMessage(message: string | null | undefined, t: I18nContextValue["t"]) {
  if (!message) return "";

  const key = backendMessageMap[message];
  return key ? t(key) : message;
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => `${values[key] ?? ""}`);
}

const backendMessageMap: Record<string, TranslationKey> = {
  "Run inside Tauri to sync": "backend.runInsideTauriSync",
  "Run inside Tauri to connect Microsoft To Do": "backend.runInsideTauriConnect",
  "Run inside Tauri to start Microsoft login": "backend.runInsideTauriLogin",
  "Opening Microsoft sign-in": "backend.openingMicrosoftSignIn",
  "Microsoft sign-in window opened": "backend.microsoftSignInOpened",
  "Waiting for Microsoft login": "backend.waitingMicrosoftLogin",
  "Login complete. Syncing Microsoft To Do": "backend.loginCompleteSyncing",
  "Login required": "backend.loginRequired",
  "Logged out": "backend.loggedOut",
  Syncing: "backend.syncing",
  "Syncing current list": "backend.syncingCurrentList",
  Synced: "backend.synced",
  "Uploading task": "backend.uploadingTask",
};

export const translations = {
  en: {
    "app.today": "Today",
    "app.inbox": "Inbox",
    "app.thisWeek": "This Week",
    "app.currentList": "Current list",
    "title.taskList": "Task list",
    "title.sortTasks": "Sort tasks",
    "title.refresh": "Refresh",
    "title.pin": "Pin",
    "title.unpin": "Unpin",
    "title.settings": "Settings",
    "sort.default": "Default",
    "sort.due": "Due date",
    "sort.importance": "Importance",
    "sort.modified": "Modified",
    "sort.created": "Created",
    "sort.reminder": "Reminder",
    "sort.title": "Title",
    "task.addPlaceholder": "Add a task...",
    "task.empty": "No open tasks for {listName}.",
    "task.thisList": "this list",
    "task.complete": "Complete {title}",
    "task.completedAria": "{title} completed",
    "task.dueDate": "Due date",
    "task.reminder": "Reminder",
    "task.repeats": "Repeats",
    "task.done": "done",
    "task.local": "local",
    "task.details": "Details",
    "quickAdd.placeholder": "Quick add to Inbox...",
    "footer.inbox": "Inbox: {count}",
    "sync.notSynced": "Not synced",
    "sync.justNow": "just now",
    "sync.minutesAgo": "{count} min ago",
    "sync.hoursAgo": "{count} hr ago",
    "sync.daysAgo": "{count} d ago",
    "sync.syncing": "Syncing",
    "sync.offline": "Offline",
    "sync.error": "Sync failed",
    "sync.authRequired": "Login required",
    "sync.idle": "Idle",
    "context.syncNow": "Sync now",
    "context.closeToTray": "Close to tray",
    "settings.title": "Settings",
    "settings.close": "Close settings",
    "settings.msConnected": "Microsoft To Do connected",
    "settings.notSignedIn": "Not signed in",
    "settings.connectedHint": "Lists and tasks will sync with this device.",
    "settings.signedOutHint": "Login to sync Microsoft To Do lists and tasks.",
    "settings.login": "Login",
    "settings.logout": "Logout",
    "settings.alwaysOnTop": "Always on top",
    "settings.opacity": "Opacity {value}%",
    "settings.language": "Language",
    "settings.languageSystem": "System",
    "settings.languageEnglish": "English",
    "settings.languageChinese": "Simplified Chinese",
    "settings.font": "Font",
    "settings.fontSystem": "System",
    "settings.fontCompact": "Compact",
    "settings.fontSerif": "Serif",
    "settings.fontMono": "Mono",
    "settings.textSize": "Text size {value}%",
    "settings.syncInterval": "Sync interval",
    "settings.minutes": "{count} min",
    "settings.startWithOs": "Start with system",
    "settings.showCompleted": "Show completed tasks",
    "settings.debugConsole": "Debug console",
    "settings.syncRemoteLists": "Sync remote lists",
    "details.title": "Task details",
    "details.close": "Close details",
    "details.fieldTitle": "Title",
    "details.importance": "Importance",
    "details.importanceLow": "Low",
    "details.importanceNormal": "Normal",
    "details.importanceHigh": "High",
    "details.due": "Due",
    "details.remindMe": "Remind me",
    "details.reminderTime": "Reminder time",
    "details.repeat": "Repeat",
    "details.notes": "Notes",
    "details.waitingUpload": "Waiting to upload",
    "details.synced": "Synced",
    "details.saving": "Saving...",
    "details.save": "Save",
    "details.repeatNone": "Does not repeat",
    "details.repeatDaily": "Daily",
    "details.repeatWeekly": "Weekly",
    "details.repeatMonthly": "Monthly",
    "details.repeatYearly": "Yearly",
    "details.resolveError": "Task details could not be resolved for this window.",
    "details.loading": "Loading task...",
    "backend.runInsideTauriSync": "Run inside Tauri to sync",
    "backend.runInsideTauriConnect": "Run inside Tauri to connect Microsoft To Do",
    "backend.runInsideTauriLogin": "Run inside Tauri to start Microsoft login",
    "backend.openingMicrosoftSignIn": "Opening Microsoft sign-in",
    "backend.microsoftSignInOpened": "Microsoft sign-in window opened",
    "backend.waitingMicrosoftLogin": "Waiting for Microsoft login",
    "backend.loginCompleteSyncing": "Login complete. Syncing Microsoft To Do",
    "backend.loginRequired": "Login required",
    "backend.loggedOut": "Logged out",
    "backend.syncing": "Syncing",
    "backend.syncingCurrentList": "Syncing current list",
    "backend.synced": "Synced",
    "backend.uploadingTask": "Uploading task",
  },
  "zh-CN": {
    "app.today": "今天",
    "app.inbox": "Inbox",
    "app.thisWeek": "本周",
    "app.currentList": "当前列表",
    "title.taskList": "任务列表",
    "title.sortTasks": "任务排序",
    "title.refresh": "刷新",
    "title.pin": "固定",
    "title.unpin": "取消固定",
    "title.settings": "设置",
    "sort.default": "默认",
    "sort.due": "到期时间",
    "sort.importance": "重要性",
    "sort.modified": "修改时间",
    "sort.created": "创建时间",
    "sort.reminder": "提醒时间",
    "sort.title": "标题",
    "task.addPlaceholder": "添加任务...",
    "task.empty": "{listName} 没有未完成任务。",
    "task.thisList": "当前列表",
    "task.complete": "完成 {title}",
    "task.completedAria": "{title} 已完成",
    "task.dueDate": "到期时间",
    "task.reminder": "提醒",
    "task.repeats": "重复",
    "task.done": "已完成",
    "task.local": "本地",
    "task.details": "详情",
    "quickAdd.placeholder": "快速添加到 Inbox...",
    "footer.inbox": "Inbox：{count}",
    "sync.notSynced": "尚未同步",
    "sync.justNow": "刚刚",
    "sync.minutesAgo": "{count} 分钟前",
    "sync.hoursAgo": "{count} 小时前",
    "sync.daysAgo": "{count} 天前",
    "sync.syncing": "同步中",
    "sync.offline": "离线",
    "sync.error": "同步失败",
    "sync.authRequired": "需要登录",
    "sync.idle": "空闲",
    "context.syncNow": "立即同步",
    "context.closeToTray": "收起到托盘",
    "settings.title": "设置",
    "settings.close": "关闭设置",
    "settings.msConnected": "已连接 Microsoft To Do",
    "settings.notSignedIn": "未登录",
    "settings.connectedHint": "列表和任务会与此设备同步。",
    "settings.signedOutHint": "登录后同步 Microsoft To Do 列表和任务。",
    "settings.login": "登录",
    "settings.logout": "退出登录",
    "settings.alwaysOnTop": "置顶显示",
    "settings.opacity": "透明度 {value}%",
    "settings.language": "语言",
    "settings.languageSystem": "跟随系统",
    "settings.languageEnglish": "English",
    "settings.languageChinese": "简体中文",
    "settings.font": "字体",
    "settings.fontSystem": "系统",
    "settings.fontCompact": "紧凑",
    "settings.fontSerif": "衬线",
    "settings.fontMono": "等宽",
    "settings.textSize": "字号 {value}%",
    "settings.syncInterval": "同步间隔",
    "settings.minutes": "{count} 分钟",
    "settings.startWithOs": "开机启动",
    "settings.showCompleted": "显示已完成任务",
    "settings.debugConsole": "调试控制台",
    "settings.syncRemoteLists": "同步远程列表",
    "details.title": "任务详情",
    "details.close": "关闭详情",
    "details.fieldTitle": "标题",
    "details.importance": "重要性",
    "details.importanceLow": "低",
    "details.importanceNormal": "普通",
    "details.importanceHigh": "高",
    "details.due": "到期时间",
    "details.remindMe": "提醒我",
    "details.reminderTime": "提醒时间",
    "details.repeat": "重复",
    "details.notes": "备注",
    "details.waitingUpload": "等待上传",
    "details.synced": "已同步",
    "details.saving": "保存中...",
    "details.save": "保存",
    "details.repeatNone": "不重复",
    "details.repeatDaily": "每天",
    "details.repeatWeekly": "每周",
    "details.repeatMonthly": "每月",
    "details.repeatYearly": "每年",
    "details.resolveError": "无法为此窗口解析任务详情。",
    "details.loading": "正在加载任务...",
    "backend.runInsideTauriSync": "请在 Tauri 应用内运行以同步",
    "backend.runInsideTauriConnect": "请在 Tauri 应用内连接 Microsoft To Do",
    "backend.runInsideTauriLogin": "请在 Tauri 应用内启动 Microsoft 登录",
    "backend.openingMicrosoftSignIn": "正在打开 Microsoft 登录",
    "backend.microsoftSignInOpened": "已打开 Microsoft 登录窗口",
    "backend.waitingMicrosoftLogin": "正在等待 Microsoft 登录",
    "backend.loginCompleteSyncing": "登录完成，正在同步 Microsoft To Do",
    "backend.loginRequired": "需要登录",
    "backend.loggedOut": "已退出登录",
    "backend.syncing": "同步中",
    "backend.syncingCurrentList": "正在同步当前列表",
    "backend.synced": "已同步",
    "backend.uploadingTask": "正在上传任务",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
