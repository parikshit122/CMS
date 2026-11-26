import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="av-offline-bar" role="status" aria-live="polite">
      <i className="bx bx-wifi-off" aria-hidden="true" />
      <span>Offline Mode — Viewing cached interface. Actions resume when reconnected.</span>
    </div>
  );
}
