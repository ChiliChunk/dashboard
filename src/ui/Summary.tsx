import { useMemo } from "react";
import { summarize } from "../domain/aggregate";
import { isWithinPeriod, resolvePeriod } from "../domain/period";
import { planProgress, planWeekAt } from "../domain/plan";
import type { Activity } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";
import type { SyncStatus as SyncStatusValue } from "../data/sync";
import { DayBreakdown } from "./DayBreakdown";
import { EmptyState } from "./EmptyState";
import { PlanOutlook } from "./PlanOutlook";
import { TargetRing } from "./TargetRing";

/**
 * Total toutes activités, en pied de carte. Il disparaît quand il répète déjà
 * la valeur principale — une semaine sans vélo ni randonnée n'a rien à ajouter.
 * La comparaison stricte suffit : le sous-ensemble à pied est sommé dans le même
 * ordre que le tout, les activités écartées n'y ajoutant que des zéros.
 */
function StatTotal({ text, redundant }: { text: string | null; redundant: boolean }) {
  if (redundant || text === null) return null;
  return (
    <p className="stat-total" data-tooltip="Total, toutes activités confondues">
      Total&nbsp;: {text}
    </p>
  );
}

interface SummaryProps {
  /** Ensemble complet des activités connues (pour distinguer « compte vide » de « période vide »). */
  allActivities: Activity[];
  status: SyncStatusValue;
}

/**
 * Les cartes ne comparent plus la semaine à la précédente : le repère utile est
 * la cible du plan, pas la semaine d'avant. Les tendances d'une période à
 * l'autre restent lisibles dans le graphique de progression et dans les quatre
 * dernières semaines.
 */
export function Summary({ allActivities, status }: SummaryProps) {
  const period = useMemo(() => resolvePeriod("current-week"), []);

  const currentActivities = useMemo(
    () => allActivities.filter((activity) => isWithinPeriod(activity.startedAtLocal, period)),
    [allActivities, period],
  );

  const total = useMemo(() => summarize(currentActivities), [currentActivities]);

  // Les quatre cartes affichent en grand la course à pied — la seule qui compte
  // pour le plan — et gardent le total tous sports en pied de carte.
  const currentRun = useMemo(
    () => summarize(currentActivities.filter((activity) => activity.sport === "run")),
    [currentActivities],
  );

  const planWeek = useMemo(() => (period.start ? planWeekAt(period.start) : null), [period.start]);
  const planRun = useMemo(
    () => (planWeek ? planProgress(planWeek, currentActivities) : null),
    [planWeek, currentActivities],
  );

  if (status === "cleared") {
    return <EmptyState variant="empty-storage" />;
  }

  if (status === "idle" || (status === "syncing" && allActivities.length === 0)) {
    return <EmptyState variant="loading" />;
  }

  return (
    <div className="stack">
      {allActivities.length === 0 ? (
        <EmptyState variant="no-account-activity" />
      ) : currentActivities.length === 0 ? (
        <EmptyState variant="empty-period" />
      ) : (
        <div className="stack">
          <div className="stat-grid">
            <div className="card stat">
              <p className="label">Sorties</p>
              <p className="value" data-tooltip="Sorties de course à pied">
                {currentRun.count}
              </p>
              <StatTotal
                text={String(total.count)}
                redundant={total.count === currentRun.count}
              />
            </div>
            <div className="card stat">
              <p className="label">Distance</p>
              <p className="value" data-tooltip="Distance parcourue en course à pied">
                {formatDistance(currentRun.totalDistance)}
              </p>
              <StatTotal
                text={formatDistance(total.totalDistance)}
                redundant={total.totalDistance === currentRun.totalDistance}
              />
            </div>
            {/* Sur les deux grandeurs pilotées par le plan, la cible passe au
                premier plan et le total tous sports descend en pied de carte :
                c'est la cible qu'on vient lire en premier, pas le cumul. */}
            <div className="card stat">
              <p className="label">D+</p>
              {planRun ? (
                <TargetRing
                  label={`Cible D+ à pied de la semaine ${planRun.week.number}`}
                  metric="elevation"
                  done={planRun.elevationGain}
                  target={planRun.week.targetElevationGain}
                  doneText={String(Math.round(planRun.elevationGain))}
                  targetText={formatElevation(planRun.week.targetElevationGain) ?? "—"}
                />
              ) : (
                <p className="value" data-tooltip="D+ en course à pied">
                  {formatElevation(currentRun.totalElevationGain)}
                </p>
              )}
              <StatTotal
                text={formatElevation(total.totalElevationGain)}
                redundant={total.totalElevationGain === currentRun.totalElevationGain}
              />
            </div>
            <div className="card stat">
              <p className="label">Durée</p>
              {planRun ? (
                <TargetRing
                  label={`Cible d'heures à pied de la semaine ${planRun.week.number}`}
                  metric="duration"
                  done={planRun.duration}
                  target={planRun.week.targetDuration}
                  doneText={formatDuration(planRun.duration) ?? "—"}
                  targetText={formatDuration(planRun.week.targetDuration) ?? "—"}
                />
              ) : (
                <p className="value" data-tooltip="Durée en course à pied">
                  {formatDuration(currentRun.totalDuration)}
                </p>
              )}
              <StatTotal
                text={formatDuration(total.totalDuration)}
                redundant={total.totalDuration === currentRun.totalDuration}
              />
            </div>
          </div>
        </div>
      )}

      <DayBreakdown period={period} activities={currentActivities} />

      <PlanOutlook activities={allActivities} />
    </div>
  );
}
