import type { Task } from "../lib/types";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  listName?: string;
  completingIds: Set<string>;
  onComplete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
};

export function TaskList({ tasks, listName, completingIds, onComplete, onOpenDetails }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span>No open tasks for {listName || "this list"}.</span>
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
