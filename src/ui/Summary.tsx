import { useMemo } from "react";
import { compareSummaries } from "../domain/aggregate";
import { isWithinPeriod, isWithinPreviousPeriod, resolvePeriod } from "../domain/period";
import type { Activity } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";
import type { SyncStatus as SyncStatusValue } from "../data/sync";
import { DayBreakdown } from "./DayBreakdown";
import { EmptyState } from "./EmptyState";
import { RecentWeeks } from "./RecentWeeks";

function signed(value: number, formatMagnitude: (value: number) => string): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatMagnitude(value)}`;
}

interface SummaryProps {
  /** Ensemble complet des activités connues (pour distinguer « compte vide » de « période vide »). */
  allActivities: Activity[];
  status: SyncStatusValue;
}

export function Summary({ allActivities, status }: SummaryProps) {
  const period = useMemo(() => resolvePeriod("current-week"), []);

  const currentActivities = useMemo(
    () => allActivities.filter((activity) => isWithinPeriod(activity.startedAtLocal, period)),
    [allActivities, period],
  );
  const previousActivities = useMemo(
    () => allActivities.filter((activity) => isWithinPreviousPeriod(activity.startedAtLocal, period)),
    [allActivities, period],
  );

  const comparison = useMemo(
    () => compareSummaries(currentActivities, previousActivities),
    [currentActivities, previousActivities],
  );
  const hasComparison = period.previousStart !== null;

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
              <p className="value">{comparison.current.count}</p>
              {hasComparison && (
                <p className="caption">
                  {signed(comparison.delta.count, (v) => String(v))} vs période précédente
                </p>
              )}
            </div>
            <div className="card stat">
              <p className="label">Distance</p>
              <p className="value">{formatDistance(comparison.current.totalDistance)}</p>
              {hasComparison && (
                <p className="caption">
                  {signed(comparison.delta.totalDistance, (v) => `${(v / 1000).toFixed(1)} km`)} vs
                  période précédente
                </p>
              )}
            </div>
            <div className="card stat">
              <p className="label">D+</p>
              <p className="value">{formatElevation(comparison.current.totalElevationGain)}</p>
              {hasComparison && (
                <p className="caption">
                  {signed(comparison.delta.totalElevationGain, (v) => `${Math.round(v)} m`)} vs
                  période précédente
                </p>
              )}
            </div>
            <div className="card stat">
              <p className="label">Durée</p>
              <p className="value">{formatDuration(comparison.current.totalDuration)}</p>
              {hasComparison && (
                <p className="caption">
                  {signed(comparison.delta.totalDuration, (v) => `${Math.round(v / 60)} min`)} vs
                  période précédente
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <DayBreakdown period={period} activities={currentActivities} />

      <RecentWeeks activities={allActivities} />
    </div>
  );
}
