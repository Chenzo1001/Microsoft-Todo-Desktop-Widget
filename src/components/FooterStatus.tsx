import clsx from "clsx";
import type { SyncStatus } from "../lib/types";
import { formatSyncTime, syncLabel } from "../lib/format";
import { localizeBackendMessage, useI18n } from "../lib/i18n";

type Props = {
  inboxCount: number;
  syncStatus: SyncStatus;
};

export function FooterStatus({ inboxCount, syncStatus }: Props) {
  const { t } = useI18n();
  const detail = syncStatus.message
    ? localizeBackendMessage(syncStatus.message, t)
    : formatSyncTime(syncStatus.lastSyncedAt, t);

  return (
    <footer className="footer-status">
      <span>{t("footer.inbox", { count: inboxCount })}</span>
      <span className={clsx("footer-status__sync", `footer-status__sync--${syncStatus.state}`)}>
        {syncLabel(syncStatus.state, t)} · {detail}
      </span>
    </footer>
  );
}
