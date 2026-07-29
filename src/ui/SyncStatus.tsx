import type { SyncStatus as SyncStatusValue } from "../data/sync";

interface SyncStatusProps {
  status: SyncStatusValue;
  syncedCount: number;
  lastSyncAt: number | null;
  errorMessage: string | null;
  onResyncAll: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Progression, date de dernière synchronisation, resynchronisation forcée (CA6.3, CA6.4, CA6.5). */
export function SyncStatus({
  status,
  syncedCount,
  lastSyncAt,
  errorMessage,
  onResyncAll,
}: SyncStatusProps) {
  return (
    <div className="card" role="status">
      {status === "syncing" && (
        <p>Synchronisation en cours… {syncedCount} sorties reçues jusqu'ici.</p>
      )}
      {status === "offline" && (
        <p>Hors ligne : les données affichées proviennent du cache local.</p>
      )}
      {status === "quota-exceeded" && (
        <p>Quota Strava atteint. La synchronisation reprendra automatiquement plus tard.</p>
      )}
      {status === "error" && errorMessage && <p>Erreur de synchronisation : {errorMessage}</p>}
      {status === "synced" && lastSyncAt !== null && (
        <p>Dernière synchronisation : {dateFormatter.format(lastSyncAt)}</p>
      )}
      <button type="button" onClick={onResyncAll}>
        Forcer une resynchronisation complète
      </button>
    </div>
  );
}
