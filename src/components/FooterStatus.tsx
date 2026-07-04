import clsx from "clsx";
import type { SyncStatus } from "../lib/types";
import { formatSyncTime, syncLabel } from "../lib/format";

type Props = {
  inboxCount: number;
  syncStatus: SyncStatus;
};

export function FooterStatus({ inboxCount, syncStatus }: Props) {
  const detail = syncStatus.message || formatSyncTime(syncStatus.lastSyncedAt);

  return (
    <footer className="footer-status">
      <span>Inbox: {inboxCount}</span>
      <span className={clsx("footer-status__sync", `footer-status__sync--${syncStatus.state}`)}>
        {syncLabel(syncStatus.state)} · {detail}
      </span>
    </footer>
  );
}
