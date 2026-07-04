import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ListRole } from "../lib/types";

type Props = {
  open: boolean;
  onAdd: (title: string, listRole: ListRole) => Promise<void>;
  onClose: () => void;
};

export function QuickAddOverlay({ open, onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  async function submit(listRole: ListRole) {
    const value = title.trim();
    if (!value) return;

    setTitle("");
    await onAdd(value, listRole);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onClose();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void submit(event.ctrlKey ? "today" : "inbox");
    }
  }

  if (!open) return null;

  return (
    <div className="quick-add">
      <Send size={18} />
      <input
        ref={inputRef}
        value={title}
        placeholder="Quick add to Inbox..."
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
