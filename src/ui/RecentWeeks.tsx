import { useMemo } from "react";
import { summarize } from "../domain/aggregate";
import { lastWeeksBuckets } from "../domain/period";
import type { Activity } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";

const WEEK_COUNT = 4;

interface RecentWeeksProps {
  /** Historique complet : les semaines affichées sont fixes, indépendantes de la période sélectionnée. */
  activities: Activity[];
}

/**
 * Une case par semaine sur les 4 dernières semaines révolues (la semaine en
 * cours, incomplète, est exclue — ses totaux ne se compareraient pas à ceux
 * d'une semaine entière), la plus ancienne à gauche.
 */
export function RecentWeeks({ activities }: RecentWeeksProps) {
  const weeks = useMemo(() => {
    // `lastWeeksBuckets` rend la plus récente en premier ; on inverse pour l'affichage.
    return lastWeeksBuckets(WEEK_COUNT)
      .slice()
      .reverse()
      .map((bucket) => {
        const summary = summarize(
          activities.filter(
            (activity) =>
              activity.startedAtLocal >= bucket.start && activity.startedAtLocal <= bucket.end,
          ),
        );
        return {
          ...bucket,
          kpis: [
            { name: "Sorties", value: String(summary.count) },
            { name: "Distance", value: formatDistance(summary.totalDistance) ?? "—" },
            { name: "D+", value: formatElevation(summary.totalElevationGain) ?? "—" },
            { name: "Durée", value: formatDuration(summary.totalMovingTime) ?? "—" },
          ],
        };
      });
  }, [activities]);

  return (
    <div className="stat-grid">
      {weeks.map((week) => (
        <div key={week.label} className="card week-stat">
          <p className="label">{week.label}</p>
          <dl className="week-kpis">
            {week.kpis.map((kpi) => (
              <div key={kpi.name}>
                <dt>{kpi.name}</dt>
                <dd>{kpi.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
