import { useMemo } from "react";
import { Route, Switch } from "wouter";
import { useUrlFilters } from "./data/filters";
import { useSync } from "./data/sync";
import { applyFilters } from "./domain/filter";
import { ActivityDetail } from "./ui/ActivityDetail";
import { ActivityList } from "./ui/ActivityList";
import { Summary } from "./ui/Summary";
import { VolumeChart } from "./ui/VolumeChart";

/**
 * Point de composition unique : la synchronisation n'est appelée qu'ici. La
 * dupliquer dans Summary ET ActivityList relancerait deux boucles de
 * synchronisation indépendantes — c'est ce que ce composant évite.
 */
function HomePage() {
  const sync = useSync();
  const [filters, setFilters] = useUrlFilters();

  const filteredActivities = useMemo(
    () => applyFilters(sync.activities, filters),
    [sync.activities, filters],
  );

  return (
    <div className="stack">
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

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/activity/:id" component={ActivityDetailPage} />
    </Switch>
  );
}
