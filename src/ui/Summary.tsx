import { useMemo, useState } from "react";
import { compareSummaries, summarizeBySport } from "../domain/aggregate";
import type { ActivityFilters } from "../domain/filter";
import { isWithinPeriod, isWithinPreviousPeriod, resolvePeriod, type PeriodKind } from "../domain/period";
import type { Activity } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";
import type { SyncStatus as SyncStatusValue } from "../data/sync";
import { DayBreakdown } from "./DayBreakdown";
import { EmptyState } from "./EmptyState";
import { PeriodHeader } from "./PeriodHeader";
import { SyncStatus } from "./SyncStatus";

const PERIOD_OPTIONS: Array<{ kind: PeriodKind; label: string }> = [
  { kind: "current-week", label: "Semaine en cours" },
  { kind: "last-30-days", label: "30 derniers jours" },
  { kind: "current-year", label: "Année en cours" },
  { kind: "previous-year", label: "Année précédente" },
  { kind: "all-time", label: "Historique complet" },
];

function signed(value: number, formatMagnitude: (value: number) => string): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatMagnitude(value)}`;
}

interface SummaryProps {
  /** Ensemble complet des activités connues, non filtré (pour distinguer « compte vide » de « période vide »). */
  allActivities: Activity[];
  /** Activités déjà passées au filtre sport/dates partagé (CA3.5). */
  filteredActivities: Activity[];
  filters: ActivityFilters;
  onFiltersChange: (next: ActivityFilters) => void;
  status: SyncStatusValue;
  syncedCount: number;
  lastSyncAt: number | null;
  errorMessage: string | null;
  onResyncAll: () => void;
}

export function Summary({
  allActivities,
  filteredActivities,
  filters,
  onFiltersChange,
  status,
  syncedCount,
  lastSyncAt,
  errorMessage,
  onResyncAll,
}: SummaryProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("current-week");
  const period = useMemo(() => resolvePeriod(periodKind), [periodKind]);

  const currentActivities = useMemo(
    () => filteredActivities.filter((activity) => isWithinPeriod(activity.startedAtLocal, period)),
    [filteredActivities, period],
  );
  const previousActivities = useMemo(
    () => filteredActivities.filter((activity) => isWithinPreviousPeriod(activity.startedAtLocal, period)),
    [filteredActivities, period],
  );

  const comparison = useMemo(
    () => compareSummaries(currentActivities, previousActivities),
    [currentActivities, previousActivities],
  );
  const bySport = useMemo(() => summarizeBySport(currentActivities), [currentActivities]);
  const hasComparison = period.previousStart !== null;

  if (status === "idle" || (status === "syncing" && allActivities.length === 0)) {
    return <EmptyState variant="loading" />;
  }

  return (
    <div>
      <PeriodHeader period={period} filters={filters} onFiltersChange={onFiltersChange}>
        <select
          value={periodKind}
          onChange={(event) => setPeriodKind(event.target.value as PeriodKind)}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.kind} value={option.kind}>
              {option.label}
            </option>
          ))}
        </select>
      </PeriodHeader>

      {allActivities.length === 0 ? (
        <EmptyState variant="no-account-activity" />
      ) : currentActivities.length === 0 ? (
        <EmptyState variant="empty-period" />
      ) : (
        <div className="card">
          <div>
            <p className="label">Sorties</p>
            <p className="value">{comparison.current.count}</p>
            {hasComparison && <p>{signed(comparison.delta.count, (v) => String(v))} vs période précédente</p>}
          </div>
          <div>
            <p className="label">Distance</p>
            <p className="value">{formatDistance(comparison.current.totalDistance)}</p>
            {hasComparison && (
              <p>
                {signed(comparison.delta.totalDistance, (v) => `${(v / 1000).toFixed(1)} km`)} vs
                période précédente
              </p>
            )}
          </div>
          <div>
            <p className="label">D+</p>
            <p className="value">{formatElevation(comparison.current.totalElevationGain)}</p>
            {hasComparison && (
              <p>
                {signed(comparison.delta.totalElevationGain, (v) => `${Math.round(v)} m`)} vs
                période précédente
              </p>
            )}
          </div>
          <div>
            <p className="label">Durée</p>
            <p className="value">{formatDuration(comparison.current.totalMovingTime)}</p>
            {hasComparison && (
              <p>
                {signed(comparison.delta.totalMovingTime, (v) => `${Math.round(v / 60)} min`)} vs
                période précédente
              </p>
            )}
          </div>
          <p>
            Répartition : course à pied {bySport.run.count}, vélo {bySport.ride.count}, randonnée{" "}
            {bySport.hike.count}
            {bySport.other.count > 0 ? `, autre ${bySport.other.count}` : ""}
          </p>
        </div>
      )}

      <DayBreakdown period={period} activities={currentActivities} />

      <SyncStatus
        status={status}
        syncedCount={syncedCount}
        lastSyncAt={lastSyncAt}
        errorMessage={errorMessage}
        onResyncAll={onResyncAll}
      />
    </div>
  );
}
