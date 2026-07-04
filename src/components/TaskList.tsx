import type { ListRole, Task } from "../lib/types";
import { useI18n } from "../lib/i18n";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  listName?: string;
  listRole?: ListRole | null;
  completingIds: Set<string>;
  onComplete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
};

export function TaskList({ tasks, listName, listRole, completingIds, onComplete, onOpenDetails }: Props) {
  const { t } = useI18n();
  const displayName = displayListName(listName, listRole, t);

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span>{t("task.empty", { listName: displayName })}</span>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          completing={completingIds.has(task.id)}
          onComplete={onComplete}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </ul>
  );
}

function displayListName(
  listName: string | undefined,
  listRole: ListRole | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (listRole === "today") return t("app.today");
  if (listRole === "inbox") return t("app.inbox");
  if (listRole === "this_week") return t("app.thisWeek");
  return listName || t("task.thisList");
}
