import { ArrowDownUp, Pin, PinOff, RefreshCw, Settings } from "lucide-react";
import clsx from "clsx";
import type { PointerEvent } from "react";
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
            title="Task list"
            onChange={(event) => onSelectList(event.target.value)}
          >
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.displayName}
              </option>
            ))}
          </select>
        ) : (
          <span className="titlebar__title" data-tauri-drag-region>
            Today
          </span>
        )}
        <span className={clsx("status-dot", `status-dot--${syncStatus.state}`)} />
      </div>
      <div className="titlebar__actions">
        <label className="sort-select" title="Sort tasks">
          <ArrowDownUp size={14} />
          <select value={sortMode} onChange={(event) => onSelectSort(event.target.value as SortMode)}>
            <option value="default">Default</option>
            <option value="due">Due date</option>
            <option value="importance">Importance</option>
            <option value="modified">Modified</option>
            <option value="created">Created</option>
            <option value="reminder">Reminder</option>
            <option value="title">Title</option>
          </select>
        </label>
        <button className="icon-button" title="Refresh" onClick={onRefresh}>
          <RefreshCw size={16} className={clsx(syncStatus.state === "syncing" && "spin")} />
        </button>
        <button className="icon-button" title={isPinned ? "Unpin" : "Pin"} onClick={onTogglePinned}>
          {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
        <button className="icon-button" title="Settings" onClick={onOpenSettings}>
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
