import { Route, Switch } from "wouter";
import type { SyncSnapshot } from "./data/sync";
import { ActivityDetail } from "./ui/ActivityDetail";
import { ActivityList } from "./ui/ActivityList";
import { Summary } from "./ui/Summary";
import { VolumeChart } from "./ui/VolumeChart";

function HomePage({ sync }: { sync: SyncSnapshot }) {
  return (
    <div className="stack">
      <Summary allActivities={sync.activities} status={sync.status} />
      <VolumeChart activities={sync.activities} />
      <ActivityList activities={sync.activities} />
    </div>
  );
}

export function AppRoutes({ sync }: { sync: SyncSnapshot }) {
  return (
    <Switch>
      <Route path="/">
        <HomePage sync={sync} />
      </Route>
      <Route path="/activity/:id" component={ActivityDetail} />
    </Switch>
  );
}
