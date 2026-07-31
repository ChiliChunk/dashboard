import { useMemo } from "react";
import { summarize } from "../domain/aggregate";
import { lastWeeksBuckets } from "../domain/period";
import { planProgress, planWeekAt, type PlanQuotaStatus } from "../domain/plan";
import type { Activity } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";

const WEEK_COUNT = 4;

const QUOTA_GLYPHS: Record<PlanQuotaStatus, string> = {
  both: "✓✓",
  one: "✓",
  none: "✗",
};

const QUOTA_LABELS: Record<PlanQuotaStatus, string> = {
  both: "Les deux quotas atteints",
  one: "Un quota sur deux atteint",
  none: "Aucun quota atteint",
};

interface RecentWeeksProps {
  /** Historique complet : les semaines affichées sont fixes, indépendantes de la période sélectionnée. */
  activities: Activity[];
}

/**
 * Une case par semaine sur les 4 dernières semaines révolues (la semaine en
 * cours, incomplète, est exclue — ses totaux ne se compareraient pas à ceux
 * d'une semaine entière), la plus ancienne à gauche.
 *
 * Les deux grandeurs pilotées par le plan (durée et D+) sont mesurées sur les
 * seules sorties de course à pied, d'où leur libellé « pied » : elles ne se
 * lisent pas comme les deux autres, qui restent tous sports confondus. Une
 * semaine antérieure au plan n'a ni cible ni marqueur.
 */
export function RecentWeeks({ activities }: RecentWeeksProps) {
  const weeks = useMemo(() => {
    // `lastWeeksBuckets` rend la plus récente en premier ; on inverse pour l'affichage.
    return lastWeeksBuckets(WEEK_COUNT)
      .slice()
      .reverse()
      .map((bucket) => {
        const weekActivities = activities.filter(
          (activity) =>
            activity.startedAtLocal >= bucket.start && activity.startedAtLocal <= bucket.end,
        );
        const summary = summarize(weekActivities);
        const runSummary = summarize(
          weekActivities.filter((activity) => activity.sport === "run"),
        );
        const planWeek = planWeekAt(bucket.start);
        const progress = planWeek ? planProgress(planWeek, weekActivities) : null;

        const elevationText = `${Math.round(runSummary.totalElevationGain)} m`;
        const durationText = formatDuration(runSummary.totalDuration) ?? "—";

        return {
          ...bucket,
          progress,
          kpis: [
            { name: "Sorties", value: String(summary.count) },
            { name: "Distance", value: formatDistance(summary.totalDistance) ?? "—" },
            {
              name: "D+ pied",
              value: planWeek
                ? `${Math.round(runSummary.totalElevationGain)} / ${formatElevation(planWeek.targetElevationGain)}`
                : elevationText,
            },
            {
              name: "Durée pied",
              value: planWeek
                ? `${durationText} / ${formatDuration(planWeek.targetDuration)}`
                : durationText,
            },
          ],
        };
      });
  }, [activities]);

  return (
    <div className="stat-grid">
      {weeks.map((week) => (
        <div key={week.label} className="card week-stat">
          <p className="label week-stat-head">
            <span>{week.label}</span>
            {week.progress && (
              <span
                className="quota-mark"
                data-status={week.progress.status}
                role="img"
                aria-label={QUOTA_LABELS[week.progress.status]}
                data-tooltip={`Semaine ${week.progress.week.number} — ${QUOTA_LABELS[week.progress.status]}`}
              >
                {QUOTA_GLYPHS[week.progress.status]}
              </span>
            )}
          </p>
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
