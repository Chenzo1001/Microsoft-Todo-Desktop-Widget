import { EyeOff, Pin, PinOff, RefreshCw, Settings } from "lucide-react";

type Props = {
  open: boolean;
  x: number;
  y: number;
  isPinned: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onTogglePinned: () => void;
  onOpenSettings: () => void;
  onHide: () => void;
};

export function WidgetContextMenu({
  open,
  x,
  y,
  isPinned,
  onClose,
  onRefresh,
  onTogglePinned,
  onOpenSettings,
  onHide,
}: Props) {
  if (!open) return null;

  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="context-menu-backdrop" onPointerDown={onClose}>
      <menu
        className="context-menu"
        style={{ left: x, top: y }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button onClick={() => run(onRefresh)}>
          <RefreshCw size={15} />
          Sync now
        </button>
        <button onClick={() => run(onTogglePinned)}>
          {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
          {isPinned ? "Unpin" : "Pin"}
        </button>
        <button onClick={() => run(onOpenSettings)}>
          <Settings size={15} />
          Settings
        </button>
        <button onClick={() => run(onHide)}>
          <EyeOff size={15} />
          Close to tray
        </button>
      </menu>
    </div>
  );
}
