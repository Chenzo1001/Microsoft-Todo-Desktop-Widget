import { Bell, CalendarDays, Check, MoreHorizontal, Repeat } from "lucide-react";
import clsx from "clsx";
import { formatTaskDate, taskDateKey } from "../lib/dates";
import { useI18n } from "../lib/i18n";
import type { Task } from "../lib/types";

type Props = {
  task: Task;
  completing: boolean;
  onComplete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
};

export function TaskItem({ task, completing, onComplete, onOpenDetails }: Props) {
  const { language, t } = useI18n();
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
        aria-label={completed ? t("task.completedAria", { title: task.title }) : t("task.complete", { title: task.title })}
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
              <span className={clsx(overdue && "task-meta--overdue")} title={t("task.dueDate")}>
                <CalendarDays size={12} />
                {formatTaskDate(task.dueDateTime, task.timeZone, language)}
              </span>
            ) : null}
            {task.isReminderOn ? (
              <span title={t("task.reminder")}>
                <Bell size={12} />
              </span>
            ) : null}
            {task.recurrence ? (
              <span title={t("task.repeats")}>
                <Repeat size={12} />
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {completed ? <span className="task-state">{t("task.done")}</span> : task.dirty ? <span className="task-pending">{t("task.local")}</span> : null}
      <button className="task-more" title={t("task.details")} onClick={() => onOpenDetails(task)}>
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
