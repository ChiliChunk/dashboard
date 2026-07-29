import type { Activity, SportKind } from "./types";

export interface ActivityFilters {
  sports: SportKind[];
  from: Date | null;
  to: Date | null;
}

export const EMPTY_FILTERS: ActivityFilters = { sports: [], from: null, to: null };

export type SortField = "date" | "distance" | "duration";
export type SortDirection = "asc" | "desc";

export function applyFilters(activities: Activity[], filters: ActivityFilters): Activity[] {
  return activities.filter((activity) => {
    if (filters.sports.length > 0 && !filters.sports.includes(activity.sport)) {
      return false;
    }
    if (filters.from && activity.startedAtLocal < filters.from) {
      return false;
    }
    if (filters.to && activity.startedAtLocal > filters.to) {
      return false;
    }
    return true;
  });
}

export function sortActivities(
  activities: Activity[],
  field: SortField,
  direction: SortDirection,
): Activity[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...activities].sort((a, b) => {
    switch (field) {
      case "date":
        return factor * (a.startedAtLocal.getTime() - b.startedAtLocal.getTime());
      case "distance":
        return factor * ((a.distance ?? 0) - (b.distance ?? 0));
      case "duration":
        return factor * ((a.movingTime ?? 0) - (b.movingTime ?? 0));
    }
  });
}
