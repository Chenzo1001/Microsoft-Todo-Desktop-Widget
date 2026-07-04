import type { TranslationKey } from "./i18n";

export function formatSyncTime(value: string | null | undefined, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  if (!value) return t("sync.notSynced");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("sync.notSynced");

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return t("sync.justNow");
  if (diffMinutes < 60) return t("sync.minutesAgo", { count: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("sync.hoursAgo", { count: diffHours });
  return t("sync.daysAgo", { count: Math.floor(diffHours / 24) });
}

export function syncLabel(state: string, t: (key: TranslationKey) => string) {
  switch (state) {
    case "syncing":
      return t("sync.syncing");
    case "offline":
      return t("sync.offline");
    case "error":
      return t("sync.error");
    case "auth_required":
      return t("sync.authRequired");
    default:
      return t("sync.idle");
  }
}
