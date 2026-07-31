import type { Activity } from "./types";

export type SortField = "date" | "distance" | "duration";
export type SortDirection = "asc" | "desc";

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
        return factor * ((a.duration ?? 0) - (b.duration ?? 0));
    }
  });
}
