import { startOfISOWeek } from "date-fns";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { garminActivityUrl } from "../domain/activity";
import { sortActivities, type SortDirection, type SortField } from "../domain/filter";
import { planWeekNumberAt } from "../domain/plan";
import type { Activity, SportKind } from "../domain/types";
import { formatDistance, formatDuration, formatElevation } from "../domain/units";
import { EmptyState } from "./EmptyState";

const SPORT_LABELS: Record<SportKind, string> = {
  run: "Course à pied",
  ride: "Vélo",
  hike: "Randonnée",
  other: "Autre",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
/* La colonne de date porte aussi la pastille de semaine du plan, d'où sa largeur. */
const GRID_TEMPLATE = "145px 1fr 130px 90px 90px 80px";
const ROW_HEIGHT = 44;

interface ActivityListProps {
  activities: Activity[];
}

function SortButton({
  label,
  field,
  activeField,
  direction,
  onChange,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onChange: (field: SortField) => void;
}) {
  const isActive = field === activeField;
  return (
    <button type="button" className={isActive ? "chip chip-active" : "chip"} onClick={() => onChange(field)}>
      {label}
      {isActive ? (direction === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

/** Liste virtualisée des sorties (CA3.1), triable (CA3.3), navigable sur un grand historique (CA3.6). */
export function ActivityList({ activities }: ActivityListProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const parentRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => sortActivities(activities, sortField, sortDirection),
    [activities, sortField, sortDirection],
  );

  /**
   * Alterne un repère visuel à chaque changement de semaine ISO rencontré en
   * parcourant la liste triée (et non un simple index pair/impair) : la
   * bande doit suivre la semaine même quand le tri n'est pas chronologique.
   */
  const weekStripes = useMemo(() => {
    const stripes: number[] = [];
    let currentWeekKey: number | null = null;
    let stripeIndex = 0;
    for (const activity of sorted) {
      const weekKey = startOfISOWeek(activity.startedAtLocal).getTime();
      if (currentWeekKey !== null && weekKey !== currentWeekKey) {
        stripeIndex += 1;
      }
      currentWeekKey = weekKey;
      stripes.push(stripeIndex % 2);
    }
    return stripes;
  }, [sorted]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (sorted.length === 0) {
    return <EmptyState variant="no-filter-match" />;
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <SortButton label="Date" field="date" activeField={sortField} direction={sortDirection} onChange={toggleSort} />
        <SortButton label="Distance" field="distance" activeField={sortField} direction={sortDirection} onChange={toggleSort} />
        <SortButton label="Durée" field="duration" activeField={sortField} direction={sortDirection} onChange={toggleSort} />
      </div>

      <div
        className="table-head"
        style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, gap: "8px" }}
      >
        <span>Date</span>
        <span>Nom</span>
        <span>Sport</span>
        <span>Distance</span>
        <span>Durée</span>
        <span>D+</span>
      </div>

      <div ref={parentRef} style={{ height: "480px", overflow: "auto", position: "relative" }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const activity = sorted[virtualRow.index];
            if (!activity) return null;
            // Rien pour les sorties antérieures au plan ou postérieures à la course.
            const planWeek = planWeekNumberAt(activity.startedAtLocal);
            return (
              <a
                key={activity.id}
                className="table-row"
                href={garminActivityUrl(activity.id)}
                target="_blank"
                rel="noopener noreferrer"
                data-week-stripe={weekStripes[virtualRow.index] === 1 ? "alt" : undefined}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: GRID_TEMPLATE,
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span className="activity-date">
                  {dateFormatter.format(activity.startedAtLocal)}
                  {planWeek !== null && (
                    <span className="plan-week-tag" aria-label={`Semaine ${planWeek} du plan`}>
                      S{planWeek}
                    </span>
                  )}
                </span>
                <span>{activity.name}</span>
                <span className="badge" data-sport={activity.sport}>
                  {SPORT_LABELS[activity.sport]}
                </span>
                <span>{formatDistance(activity.distance) ?? "—"}</span>
                <span>{formatDuration(activity.duration) ?? "—"}</span>
                <span>{formatElevation(activity.elevationGain) ?? "—"}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
