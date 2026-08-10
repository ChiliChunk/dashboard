import { useSync } from "./data/sync";
import { AppRoutes } from "./routes";
import { AppHeader } from "./ui/AppHeader";
import { usePlanWeekSelection } from "./ui/planWeek";

/**
 * La synchronisation est appelée ici, au-dessus des routes : le bandeau doit
 * rester visible et à jour sur toutes les pages, et une seule boucle de
 * synchronisation doit exister pour toute l'application. La semaine
 * sélectionnée y vit pour la même raison : le bandeau en affiche les dates,
 * une vue de la page d'accueil la choisit.
 */
export function App() {
  const sync = useSync();
  const planWeek = usePlanWeekSelection();

  return (
    <>
      <AppHeader
        periodLabel={planWeek.label}
        storedCount={sync.activities.length}
        status={sync.status}
        newCount={sync.newCount}
        lastSyncAt={sync.lastSyncAt}
        errorMessage={sync.errorMessage}
        onResync={sync.resync}
        onClear={sync.clearStored}
      />
      <AppRoutes sync={sync} planWeek={planWeek} />
    </>
  );
}
