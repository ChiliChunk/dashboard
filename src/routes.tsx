import { Route, Switch } from "wouter";
import type { SyncSnapshot } from "./data/sync";
import { ActivityDetail } from "./ui/ActivityDetail";
import { ActivityList } from "./ui/ActivityList";
import { PlanHistory } from "./ui/PlanHistory";
import type { PlanWeekSelection } from "./ui/planWeek";
import { RenfoView } from "./ui/RenfoView";
import { Summary } from "./ui/Summary";
import { VolumeChart } from "./ui/VolumeChart";

interface RoutesProps {
  sync: SyncSnapshot;
  planWeek: PlanWeekSelection;
}

function HomePage({ sync, planWeek }: RoutesProps) {
  return (
    <div className="stack">
      <Summary allActivities={sync.activities} status={sync.status} planWeek={planWeek} />
      <VolumeChart activities={sync.activities} />
      <ActivityList activities={sync.activities} />
    </div>
  );
}

export function AppRoutes({ sync, planWeek }: RoutesProps) {
  return (
    <Switch>
      <Route path="/">
        <HomePage sync={sync} planWeek={planWeek} />
      </Route>
      <Route path="/historique">
        <PlanHistory activities={sync.activities} />
      </Route>
      <Route path="/renfo" component={RenfoView} />
      <Route path="/activity/:id" component={ActivityDetail} />
    </Switch>
  );
}
