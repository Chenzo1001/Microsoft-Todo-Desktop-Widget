import { Bell, CalendarDays, Check, MoreHorizontal, Repeat } from "lucide-react";
import clsx from "clsx";
import { formatTaskDate, taskDateKey } from "../lib/dates";
import type { Task } from "../lib/types";

type Props = {
  task: Task;
  completing: boolean;
  onComplete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
};

export function TaskItem({ task, completing, onComplete, onOpenDetails }: Props) {
  const overdue = isDueTodayOrEarlier(task);
  const completed = task.status === "completed";

  return (
    <li
      className={clsx(
        "task-item",
        completing && "task-item--completing",
        overdue && "task-item--overdue",
        completed && "task-item--completed",
      )}
    >
      <button
        className="task-checkbox"
        aria-label={completed ? `${task.title} completed` : `Complete ${task.title}`}
        disabled={completing || completed}
        onClick={() => onComplete(task.id)}
      >
        {completed ? <Check size={13} /> : null}
      </button>
      <span className="task-main">
        <span className="task-title">{task.title}</span>
        {task.dueDateTime || task.isReminderOn || task.recurrence ? (
          <span className="task-meta">
            {task.dueDateTime ? (
              <span className={clsx(overdue && "task-meta--overdue")} title="Due date">
                <CalendarDays size={12} />
                {formatTaskDate(task.dueDateTime, task.timeZone)}
              </span>
            ) : null}
            {task.isReminderOn ? (
              <span title="Reminder">
                <Bell size={12} />
              </span>
            ) : null}
            {task.recurrence ? (
              <span title="Repeats">
                <Repeat size={12} />
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {completed ? <span className="task-state">done</span> : task.dirty ? <span className="task-pending">local</span> : null}
      <button className="task-more" title="Details" onClick={() => onOpenDetails(task)}>
        <MoreHorizontal size={16} />
      </button>
    </li>
  );
}

function isDueTodayOrEarlier(task: Task) {
  if (!task.dueDateTime || task.status === "completed") return false;
  return taskDateKey(task.dueDateTime, task.timeZone) <= todayKey();
}

function todayKey() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
