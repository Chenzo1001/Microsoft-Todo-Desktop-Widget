import { formatDistanceToNow } from "date-fns";

export function formatSyncTime(value?: string | null) {
  if (!value) return "Not synced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";

  return `${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function syncLabel(state: string) {
  switch (state) {
    case "syncing":
      return "Syncing";
    case "offline":
      return "Offline";
    case "error":
      return "Sync failed";
    case "auth_required":
      return "Login required";
    default:
      return "Idle";
  }
}
