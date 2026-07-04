import { LogIn, LogOut, RotateCcw, UserCircle, X } from "lucide-react";
import { localizeBackendMessage, useI18n } from "../lib/i18n";
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
  const { t } = useI18n();

  if (!open) return null;

  return (
    <aside className="settings-panel">
      <div className="settings-panel__header">
        <h2>{t("settings.title")}</h2>
        <button className="icon-button" title={t("settings.close")} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <section
        className={
          auth.loggedIn
            ? "settings-group settings-account settings-account--signed-in"
            : "settings-group settings-account settings-account--signed-out"
        }
      >
        <UserCircle size={30} />
        <div>
          <strong>{auth.loggedIn ? auth.account || t("settings.msConnected") : t("settings.notSignedIn")}</strong>
          <span>
            {(loginNotice && localizeBackendMessage(loginNotice, t)) ||
              (auth.loggedIn ? t("settings.connectedHint") : t("settings.signedOutHint"))}
          </span>
        </div>
        <button className="text-button" onClick={auth.loggedIn ? onLogout : onLogin}>
          {auth.loggedIn ? <LogOut size={16} /> : <LogIn size={16} />}
          {auth.loggedIn ? t("settings.logout") : t("settings.login")}
        </button>
      </section>

      <label className="settings-row">
        <span>{t("settings.alwaysOnTop")}</span>
        <input
          type="checkbox"
          checked={settings.alwaysOnTop}
          onChange={(event) => onChange({ alwaysOnTop: event.target.checked })}
        />
      </label>

      <label className="settings-row settings-row--stacked">
        <span>{t("settings.opacity", { value: Math.round(settings.opacity * 100) })}</span>
        <input
          min={70}
          max={100}
          type="range"
          value={Math.round(settings.opacity * 100)}
          onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="settings-row">
        <span>{t("settings.language")}</span>
        <select
          value={settings.language}
          onChange={(event) => onChange({ language: event.target.value as Settings["language"] })}
        >
          <option value="system">{t("settings.languageSystem")}</option>
          <option value="en">{t("settings.languageEnglish")}</option>
          <option value="zh-CN">{t("settings.languageChinese")}</option>
        </select>
      </label>

      <label className="settings-row">
        <span>{t("settings.font")}</span>
        <select
          value={settings.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value as Settings["fontFamily"] })}
        >
          <option value="system">{t("settings.fontSystem")}</option>
          <option value="compact">{t("settings.fontCompact")}</option>
          <option value="serif">{t("settings.fontSerif")}</option>
          <option value="mono">{t("settings.fontMono")}</option>
        </select>
      </label>

      <label className="settings-row settings-row--stacked">
        <span>{t("settings.textSize", { value: Math.round(settings.fontScale * 100) })}</span>
        <input
          min={90}
          max={120}
          type="range"
          value={Math.round(settings.fontScale * 100)}
          onChange={(event) => onChange({ fontScale: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="settings-row">
        <span>{t("settings.syncInterval")}</span>
        <select
          value={settings.syncIntervalMinutes}
          onChange={(event) => onChange({ syncIntervalMinutes: Number(event.target.value) })}
        >
          <option value={1}>{t("settings.minutes", { count: 1 })}</option>
          <option value={3}>{t("settings.minutes", { count: 3 })}</option>
          <option value={5}>{t("settings.minutes", { count: 5 })}</option>
          <option value={10}>{t("settings.minutes", { count: 10 })}</option>
        </select>
      </label>

      <label className="settings-row">
        <span>{t("settings.startWithOs")}</span>
        <input
          type="checkbox"
          checked={settings.autostart}
          onChange={(event) => onChange({ autostart: event.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>{t("settings.showCompleted")}</span>
        <input
          type="checkbox"
          checked={settings.showCompleted}
          onChange={(event) => onChange({ showCompleted: event.target.checked })}
        />
      </label>

      <label className="settings-row">
        <span>{t("settings.debugConsole")}</span>
        <input
          type="checkbox"
          checked={settings.debugMode}
          onChange={(event) => onChange({ debugMode: event.target.checked })}
        />
      </label>

      <button className="secondary-button" onClick={onEnsureLists}>
        <RotateCcw size={16} />
        {t("settings.syncRemoteLists")}
      </button>
    </aside>
  );
}
