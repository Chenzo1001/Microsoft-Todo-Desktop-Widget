import { ArrowDownUp, Pin, PinOff, RefreshCw, Settings } from "lucide-react";
import clsx from "clsx";
import type { PointerEvent } from "react";
import { useI18n } from "../lib/i18n";
import type { SortMode, SyncStatus, TaskList } from "../lib/types";

type Props = {
  isPinned: boolean;
  taskLists: TaskList[];
  selectedListId?: string | null;
  sortMode: SortMode;
  syncStatus: SyncStatus;
  onDragStart: () => void;
  onSelectList: (listId: string) => void;
  onSelectSort: (sortMode: SortMode) => void;
  onRefresh: () => void;
  onTogglePinned: () => void;
  onOpenSettings: () => void;
};

export function TitleBar({
  isPinned,
  taskLists,
  selectedListId,
  sortMode,
  syncStatus,
  onDragStart,
  onSelectList,
  onSelectSort,
  onRefresh,
  onTogglePinned,
  onOpenSettings,
}: Props) {
  const { t } = useI18n();

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, .sort-select")) return;
    onDragStart();
  }

  return (
    <header className="titlebar" data-tauri-drag-region onPointerDown={handlePointerDown}>
      <div className="titlebar__copy" data-tauri-drag-region>
        {taskLists.length > 0 ? (
          <select
            className="list-select"
            value={selectedListId || taskLists[0]?.id || ""}
            title={t("title.taskList")}
            onChange={(event) => onSelectList(event.target.value)}
          >
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {displayListName(list, t)}
              </option>
            ))}
          </select>
        ) : (
          <span className="titlebar__title" data-tauri-drag-region>
            {t("app.today")}
          </span>
        )}
        <span className={clsx("status-dot", `status-dot--${syncStatus.state}`)} />
      </div>
      <div className="titlebar__actions">
        <label className="sort-select" title={t("title.sortTasks")}>
          <ArrowDownUp size={14} />
          <select value={sortMode} onChange={(event) => onSelectSort(event.target.value as SortMode)}>
            <option value="default">{t("sort.default")}</option>
            <option value="due">{t("sort.due")}</option>
            <option value="importance">{t("sort.importance")}</option>
            <option value="modified">{t("sort.modified")}</option>
            <option value="created">{t("sort.created")}</option>
            <option value="reminder">{t("sort.reminder")}</option>
            <option value="title">{t("sort.title")}</option>
          </select>
        </label>
        <button className="icon-button" title={t("title.refresh")} onClick={onRefresh}>
          <RefreshCw size={16} className={clsx(syncStatus.state === "syncing" && "spin")} />
        </button>
        <button className="icon-button" title={isPinned ? t("title.unpin") : t("title.pin")} onClick={onTogglePinned}>
          {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
        <button className="icon-button" title={t("title.settings")} onClick={onOpenSettings}>
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}

function displayListName(list: TaskList, t: ReturnType<typeof useI18n>["t"]) {
  if (list.role === "today") return t("app.today");
  if (list.role === "inbox") return t("app.inbox");
  if (list.role === "this_week") return t("app.thisWeek");
  return list.displayName;
}
