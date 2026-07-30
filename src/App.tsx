import { useSync } from "./data/sync";
import { AppRoutes } from "./routes";
import { AppHeader } from "./ui/AppHeader";

/**
 * La synchronisation est appelée ici, au-dessus des routes : le bandeau doit
 * rester visible et à jour sur toutes les pages, et une seule boucle de
 * synchronisation doit exister pour toute l'application.
 */
export function App() {
  const sync = useSync();

  return (
    <>
      <AppHeader
        storedCount={sync.activities.length}
        status={sync.status}
        newCount={sync.newCount}
        lastSyncAt={sync.lastSyncAt}
        errorMessage={sync.errorMessage}
        onResync={sync.resync}
        onClear={sync.clearStored}
      />
      <AppRoutes sync={sync} />
    </>
  );
}
