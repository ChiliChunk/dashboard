import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { PeriodRange } from "./period";
import type { Activity, SportKind } from "./types";

export type Granularity = "week" | "month";
export type VolumeMetric = "distance" | "duration" | "elevation";

export interface TimelineBucket {
  start: Date;
  end: Date;
  label: string;
  value: number;
  bySport: Record<SportKind, number>;
}

function bucketStarts(start: Date, end: Date, granularity: Granularity): Date[] {
  const starts: Date[] = [];
  let cursor =
    granularity === "week" ? startOfWeek(start, { weekStartsOn: 1 }) : startOfMonth(start);
  while (cursor <= end) {
    starts.push(cursor);
    cursor = granularity === "week" ? addWeeks(cursor, 1) : addMonths(cursor, 1);
  }
  return starts;
}

function metricValue(activity: Activity, metric: VolumeMetric): number {
  switch (metric) {
    case "distance":
      return activity.distance ?? 0;
    case "duration":
      return activity.movingTime ?? 0;
    case "elevation":
      return activity.elevationGain ?? 0;
  }
}

/**
 * Découpe une période en semaines ou en mois (CA5.1). Chaque case existe même
 * sans activité, avec une valeur de 0 — un vrai creux, jamais une case absente
 * qui laisserait le graphique interpoler entre deux points non adjacents (CA5.4).
 * Reçoit des activités déjà filtrées par sport par l'appelant (CA5.3).
 */
export function buildTimeline(
  activities: Activity[],
  period: PeriodRange,
  granularity: Granularity,
  metric: VolumeMetric,
): TimelineBucket[] {
  const earliestActivity = activities.reduce<Date | null>((earliest, activity) => {
    if (!earliest || activity.startedAtLocal < earliest) return activity.startedAtLocal;
    return earliest;
  }, null);
  const rangeStart = period.start ?? earliestActivity ?? period.end;
  const rangeEnd = period.end;

  const starts = bucketStarts(rangeStart, rangeEnd, granularity);

  return starts.map((bucketStart) => {
    const bucketEnd =
      granularity === "week" ? endOfWeek(bucketStart, { weekStartsOn: 1 }) : endOfMonth(bucketStart);
    const bucketActivities = activities.filter((activity) =>
      isWithinInterval(activity.startedAtLocal, { start: bucketStart, end: bucketEnd }),
    );

    const bySport: Record<SportKind, number> = { run: 0, ride: 0, hike: 0, other: 0 };
    let value = 0;
    for (const activity of bucketActivities) {
      const contribution = metricValue(activity, metric);
      value += contribution;
      bySport[activity.sport] += contribution;
    }

    return {
      start: bucketStart,
      end: bucketEnd,
      label:
        granularity === "week"
          ? format(bucketStart, "d MMM", { locale: fr })
          : format(bucketStart, "MMM yyyy", { locale: fr }),
      value,
      bySport,
    };
  });
}
