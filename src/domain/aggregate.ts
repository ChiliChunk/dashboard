import type { Activity, SportKind } from "./types";

export interface PeriodSummary {
  count: number;
  totalDistance: number;
  totalDuration: number;
  totalElevationGain: number;
}

const EMPTY_SUMMARY: PeriodSummary = {
  count: 0,
  totalDistance: 0,
  totalDuration: 0,
  totalElevationGain: 0,
};

/** Une grandeur absente (`null`) n'apporte rien à la somme — jamais une erreur. */
export function summarize(activities: Activity[]): PeriodSummary {
  return activities.reduce<PeriodSummary>(
    (acc, activity) => ({
      count: acc.count + 1,
      totalDistance: acc.totalDistance + (activity.distance ?? 0),
      totalDuration: acc.totalDuration + (activity.duration ?? 0),
      totalElevationGain: acc.totalElevationGain + (activity.elevationGain ?? 0),
    }),
    { ...EMPTY_SUMMARY },
  );
}

export function summarizeBySport(activities: Activity[]): Record<SportKind, PeriodSummary> {
  const bySport: Record<SportKind, Activity[]> = { run: [], ride: [], hike: [], other: [] };
  for (const activity of activities) {
    bySport[activity.sport].push(activity);
  }
  return {
    run: summarize(bySport.run),
    ride: summarize(bySport.ride),
    hike: summarize(bySport.hike),
    other: summarize(bySport.other),
  };
}
