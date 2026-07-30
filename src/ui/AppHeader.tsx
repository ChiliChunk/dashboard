import type { SyncStatus as SyncStatusValue } from "../data/sync";

interface AppHeaderProps {
  /** Nombre d'activités présentes dans le stockage local. */
  storedCount: number;
  status: SyncStatusValue;
  /** Nouvelles sorties rapatriées pendant la passe en cours ou la dernière. */
  newCount: number;
  lastSyncAt: number | null;
  errorMessage: string | null;
  onResync: () => void;
  onClear: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** En français, 0 et 1 sont au singulier. */
function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular;
}

function newActivitiesLabel(count: number): string {
  return `${count} ${plural(count, "nouvelle sortie", "nouvelles sorties")} ${plural(count, "récupérée", "récupérées")}`;
}

/** Flèche circulaire de rafraîchissement. `aria-hidden` : le bouton porte le libellé. */
function SyncIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/**
 * Bandeau permanent : ce que contient le stockage local, l'action qui va
 * chercher les nouveautés (jamais l'historique déjà stocké) et celle qui vide
 * la copie locale. La progression est indéterminée à dessein — le service
 * pagine sans connaître le nombre total d'activités, afficher un pourcentage
 * reviendrait à l'inventer (CA6.3, CA6.4, CA6.5).
 */
export function AppHeader({
  storedCount,
  status,
  newCount,
  lastSyncAt,
  errorMessage,
  onResync,
  onClear,
}: AppHeaderProps) {
  const isSyncing = status === "syncing";

  return (
    <header className="app-header">
      <div className="app-header-line">
        <p className="app-header-count">
          <strong>{storedCount}</strong> {plural(storedCount, "activité stockée", "activités stockées")}
        </p>

        <div className="app-header-state" role="status">
          {isSyncing && <span className="caption">{newActivitiesLabel(newCount)}…</span>}
          {status === "synced" &&
            (newCount > 0 ? (
              <span className="caption">{newActivitiesLabel(newCount)}</span>
            ) : (
              lastSyncAt !== null && (
                <span className="caption muted">À jour — {dateFormatter.format(lastSyncAt)}</span>
              )
            ))}
          {status === "cleared" && <span className="caption">Stockage local vidé</span>}
          {status === "offline" && <span className="caption">Hors ligne — stockage local affiché</span>}
          {status === "error" && errorMessage && (
            <span className="caption">Échec de synchronisation : {errorMessage}</span>
          )}
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={onResync}
            disabled={isSyncing}
            data-syncing={isSyncing}
            aria-label={isSyncing ? "Synchronisation en cours" : "Chercher les nouvelles activités"}
            title={isSyncing ? "Synchronisation en cours" : "Chercher les nouvelles activités"}
          >
            <SyncIcon />
          </button>

          <button
            type="button"
            className="icon-button icon-button-danger"
            onClick={onClear}
            // Interdit pendant une passe : la boucle de synchronisation
            // continuerait d'écrire dans une base qu'on vient de supprimer.
            disabled={isSyncing || storedCount === 0}
            aria-label="Vider le stockage local"
            title="Vider le stockage local"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {isSyncing && (
        <div className="progress" role="progressbar" aria-label="Synchronisation en cours">
          <div className="progress-bar" />
        </div>
      )}
    </header>
  );
}
