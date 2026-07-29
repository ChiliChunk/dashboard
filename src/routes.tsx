import { useMemo } from "react";
import { Route, Switch } from "wouter";
import { useUrlFilters } from "./data/filters";
import { useSession } from "./data/session";
import { useSync } from "./data/sync";
import { applyFilters } from "./domain/filter";
import { ActivityDetail } from "./ui/ActivityDetail";
import { ActivityList } from "./ui/ActivityList";
import { Summary } from "./ui/Summary";
import { VolumeChart } from "./ui/VolumeChart";

/**
 * Point de composition unique : la session et la synchronisation ne sont
 * appelées qu'ici. Les dupliquer dans Summary ET ActivityList relancerait
 * deux boucles de synchronisation indépendantes et doublerait la consommation
 * du quota Strava (article IV) — c'est ce que ce composant évite.
 */
function HomePage() {
  const { session } = useSession();
  const sync = useSync(session?.accessToken ?? null, session?.athleteId ?? null);
  const [filters, setFilters] = useUrlFilters();

  const filteredActivities = useMemo(
    () => applyFilters(sync.activities, filters),
    [sync.activities, filters],
  );

  return (
    <div>
      <Summary
        allActivities={sync.activities}
        filteredActivities={filteredActivities}
        filters={filters}
        onFiltersChange={setFilters}
        status={sync.status}
        syncedCount={sync.syncedCount}
        lastSyncAt={sync.lastSyncAt}
        errorMessage={sync.errorMessage}
        onResyncAll={sync.resyncAll}
      />
      <VolumeChart activities={filteredActivities} />
      <ActivityList activities={filteredActivities} />
    </div>
  );
}

function ActivityDetailPage() {
  return <ActivityDetail />;
}

function AuthDonePage() {
  return <div>Connexion en cours (à venir)</div>;
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/activity/:id" component={ActivityDetailPage} />
      <Route path="/auth/done" component={AuthDonePage} />
    </Switch>
  );
}
