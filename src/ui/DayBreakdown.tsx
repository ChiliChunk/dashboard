import { addDays, format, isAfter, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { summarize } from "../domain/aggregate";
import type { PeriodRange } from "../domain/period";
import type { Activity } from "../domain/types";

interface DayBreakdownProps {
  period: PeriodRange;
  activities: Activity[];
}

type DayState = "future" | "empty" | "active";

/** Répartition jour par jour de la semaine en cours (CA2.7). Chaque état a son propre texte (CA2.8, ENF6). */
export function DayBreakdown({ period, activities }: DayBreakdownProps) {
  if (period.kind !== "current-week" || period.start === null) {
    return null;
  }

  const today = startOfDay(new Date());
  const weekStart = period.start;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <div className="card">
      <p className="label">Répartition par jour</p>
      <ul style={{ display: "flex", gap: "12px", listStyle: "none", padding: 0, margin: 0 }}>
        {days.map((day) => {
          const dayActivities = activities.filter((activity) =>
            isSameDay(activity.startedAtLocal, day),
          );
          const summary = summarize(dayActivities);
          const state: DayState = isAfter(startOfDay(day), today)
            ? "future"
            : dayActivities.length > 0
              ? "active"
              : "empty";

          return (
            <li key={day.toISOString()} data-state={state}>
              <p>{format(day, "EEE", { locale: fr })}</p>
              <p>{format(day, "d MMM", { locale: fr })}</p>
              <p>
                {state === "future"
                  ? "à venir"
                  : state === "empty"
                    ? "aucune sortie"
                    : `${(summary.totalDistance / 1000).toFixed(1)} km`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
