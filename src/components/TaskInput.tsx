import { KeyboardEvent, useState } from "react";
import { Plus } from "lucide-react";
import type { ListRole } from "../lib/types";

type Props = {
  disabled?: boolean;
  onAdd: (title: string, listRole: ListRole) => Promise<void>;
};

export function TaskInput({ disabled, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(listRole: ListRole) {
    const value = title.trim();
    if (!value || busy || disabled) return;

    setBusy(true);
    setTitle("");
    try {
      await onAdd(value, listRole);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit(event.ctrlKey ? "inbox" : "today");
    }

    if (event.key === "Escape") {
      setTitle("");
      event.currentTarget.blur();
    }
  }

  return (
    <label className="task-input">
      <Plus size={18} />
      <input
        value={title}
        disabled={disabled || busy}
        placeholder="Add a task..."
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}
