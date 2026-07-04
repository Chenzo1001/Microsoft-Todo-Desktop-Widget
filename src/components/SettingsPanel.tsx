import { LogIn, LogOut, RotateCcw, UserCircle, X } from "lucide-react";
import type { AuthStatus, Settings } from "../lib/types";

type Props = {
  open: boolean;
  auth: AuthStatus;
  settings: Settings;
  loginNotice?: string | null;
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onChange: (settings: Partial<Settings>) => void;
  onEnsureLists: () => void;
};

export function SettingsPanel({
  open,
  auth,
  settings,
  loginNotice,
  onClose,
  onLogin,
  onLogout,
  onChange,
  onEnsureLists,
}: Props) {
  if (!open) return null;

  return (
    <aside className="settings-panel">
      <div className="settings-panel__header">
        <h2>Settings</h2>
        <button className="icon-button" title="Close settings" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <section className={auth.loggedIn ? "settings-group settings-account settings-account--signed-in" : "settings-group settings-account settings-account--signed-out"}>
        <UserCircle size={30} />
        <div>
          <strong>{auth.loggedIn ? auth.account || "Microsoft To Do connected" : "Not signed in"}</strong>
          <span>
            {loginNotice ||
              (auth.loggedIn
                ? "Lists and tasks will sync with this device."
                : "Login to sync Microsoft To Do lists and tasks.")}
          </span>
        </div>
        <button className="text-button" onClick={auth.loggedIn ? onLogout : onLogin}>
          {auth.loggedIn ? <LogOut size={16} /> : <LogIn size={16} />}
          {auth.loggedIn ? "Logout" : "Login"}
        </button>
      </section>

      <label className="settings-row">
        <span>Always on top</span>
        <input
          type="checkbox"
          checked={settings.alwaysOnTop}
          onChange={(event) => onChange({ alwaysOnTop: event.target.checked })}
        />
      </label>

      <label className="settings-row settings-row--stacked">
        <span>Opacity {Math.round(settings.opacity * 100)}%</span>
        <input
          min={70}
          max={100}
          type="range"
          value={Math.round(settings.opacity * 100)}
          onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="settings-row">
        <span>Font</span>
        <select
          value={settings.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value as Settings["fontFamily"] })}
        >
          <option value="system">System</option>
          <option value="compact">Compact</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
      </label>

      <label className="settings-row settings-row--stacked">
        <span>Text size {Math.round(settings.fontScale * 100)}%</span>
        <input
          min={90}
          max={120}
          type="range"
          value={Math.round(settings.fontScale * 100)}
          onChange={(event) => onChange({ fontScale: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="settings-row">
        <span>Sync interval</span>
        <select
          value={settings.syncIntervalMinutes}
          onChange={(event) => onChange({ syncIntervalMinutes: Number(event.target.value) })}
        >
          <option value={1}>1 min</option>
          <option value={3}>3 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
        </select>
      </label>

      <label className="settings-row">
        <span>Start with Windows</span>
        <input
          type="checkbox"
          checked={settings.autostart}
          onChange={(event) => onChange({ autostart: event.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>Show completed tasks</span>
        <input
          type="checkbox"
          checked={settings.showCompleted}
          onChange={(event) => onChange({ showCompleted: event.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>Debug console</span>
        <input
          type="checkbox"
          checked={settings.debugMode}
          onChange={(event) => onChange({ debugMode: event.target.checked })}
        />
      </label>

      <button className="secondary-button" onClick={onEnsureLists}>
        <RotateCcw size={16} />
        Sync remote lists
      </button>
    </aside>
  );
}
