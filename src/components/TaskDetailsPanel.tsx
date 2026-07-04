import { Bell, CalendarDays, Repeat, StickyNote, X } from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { api } from "../lib/api";
import { taskDateKey } from "../lib/dates";
import type { Recurrence, RecurrenceMode, Task, TaskList, TaskPatch } from "../lib/types";

type Props = {
  task: Task | null;
  taskList?: TaskList;
  saving?: boolean;
  windowed?: boolean;
  onClose: () => void;
  onSave: (taskId: string, patch: TaskPatch) => Promise<void>;
};

const recurrenceOptions: Array<{ value: RecurrenceMode; label: string }> = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function TaskDetailsPanel({ task, taskList, saving, windowed, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [importance, setImportance] = useState<"low" | "normal" | "high">("normal");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [isReminderOn, setIsReminderOn] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>("none");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setImportance(task.importance || "normal");
    setNote(task.note || "");
    setDueDate(toDateInput(task.dueDateTime, task.timeZone));
    setReminderDateTime(toDateTimeInput(task.reminderDateTime));
    setIsReminderOn(Boolean(task.isReminderOn));
    setRecurrenceMode(recurrenceToMode(task.recurrence));
  }, [task]);

  const dirty = useMemo(() => {
    if (!task) return false;
    return (
      title.trim() !== task.title ||
      importance !== (task.importance || "normal") ||
      note !== (task.note || "") ||
      dueDate !== toDateInput(task.dueDateTime, task.timeZone) ||
      reminderDateTime !== toDateTimeInput(task.reminderDateTime) ||
      isReminderOn !== Boolean(task.isReminderOn) ||
      recurrenceMode !== recurrenceToMode(task.recurrence)
    );
  }, [dueDate, importance, isReminderOn, note, recurrenceMode, reminderDateTime, task, title]);

  if (!task) return null;

  function handleHeaderPointerDown(event: PointerEvent<HTMLElement>) {
    if (!windowed || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea")) return;
    void api.startWindowDrag();
  }

  async function submit() {
    if (!task || saving) return;
    const nextReminder = isReminderOn ? normalizeDateTimeInput(reminderDateTime) : null;
    await onSave(task.id, {
      title: title.trim() || task.title,
      importance,
      note: note.trim() || null,
      dueDateTime: dueDate ? `${dueDate}T00:00:00` : null,
      reminderDateTime: nextReminder,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || task.timeZone || null,
      isReminderOn: Boolean(nextReminder),
      recurrence: buildRecurrence(recurrenceMode, dueDate),
    });
  }

  return (
    <aside className={clsx("details-panel", windowed && "details-panel--window")}>
      <div className={clsx("details-panel__header", windowed && "details-panel__header--draggable")} onPointerDown={handleHeaderPointerDown}>
        <div>
          <h2>Task details</h2>
          <span>{taskList?.displayName || "Current list"}</span>
        </div>
        <button className="icon-button" title="Close details" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="details-form">
        <label className="details-field details-field--title">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="details-field">
          <span>Importance</span>
          <select value={importance} onChange={(event) => setImportance(event.target.value as typeof importance)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="details-field">
          <span>
            <CalendarDays size={14} />
            Due
          </span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>

        <label className="details-field details-field--checkbox">
          <span>
            <Bell size={14} />
            Remind me
          </span>
          <input
            type="checkbox"
            checked={isReminderOn}
            onChange={(event) => setIsReminderOn(event.target.checked)}
          />
        </label>

        <label className="details-field">
          <span>Reminder time</span>
          <input
            type="datetime-local"
            value={reminderDateTime}
            disabled={!isReminderOn}
            onChange={(event) => setReminderDateTime(event.target.value)}
          />
        </label>

        <label className="details-field">
          <span>
            <Repeat size={14} />
            Repeat
          </span>
          <select
            value={recurrenceMode}
            onChange={(event) => setRecurrenceMode(event.target.value as RecurrenceMode)}
          >
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="details-field details-field--notes">
          <span>
            <StickyNote size={14} />
            Notes
          </span>
          <textarea value={note} rows={5} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>

      <div className="details-actions">
        <span>{task.dirty ? "Waiting to upload" : "Synced"}</span>
        <button className="text-button" disabled={!dirty || saving} onClick={() => void submit()}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </aside>
  );
}

function toDateInput(value?: string | null, timeZone?: string | null) {
  return taskDateKey(value, timeZone);
}

function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function normalizeDateTimeInput(value: string) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

function recurrenceToMode(recurrence?: Recurrence | null): RecurrenceMode {
  const type = recurrence?.pattern?.type;
  if (type === "daily") return "daily";
  if (type === "weekly") return "weekly";
  if (type === "absoluteMonthly") return "monthly";
  if (type === "absoluteYearly") return "yearly";
  return "none";
}

function buildRecurrence(mode: RecurrenceMode, dueDate: string): Recurrence | null {
  if (mode === "none") return null;

  const startDate = dueDate || new Date().toISOString().slice(0, 10);
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    date.getDay()
  ];

  if (mode === "daily") {
    return { pattern: { type: "daily", interval: 1 }, range: { type: "noEnd", startDate } };
  }

  if (mode === "weekly") {
    return {
      pattern: {
        type: "weekly",
        interval: 1,
        daysOfWeek: [dayOfWeek],
        firstDayOfWeek: "sunday",
      } as Recurrence["pattern"],
      range: { type: "noEnd", startDate },
    };
  }

  if (mode === "monthly") {
    return {
      pattern: { type: "absoluteMonthly", interval: 1, dayOfMonth: date.getDate() } as Recurrence["pattern"],
      range: { type: "noEnd", startDate },
    };
  }

  return {
    pattern: {
      type: "absoluteYearly",
      interval: 1,
      dayOfMonth: date.getDate(),
      month: date.getMonth() + 1,
    } as Recurrence["pattern"],
    range: { type: "noEnd", startDate },
  };
}
