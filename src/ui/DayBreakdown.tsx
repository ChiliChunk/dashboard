import { addDays, format, isAfter, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { summarize } from "../domain/aggregate";
import type { PeriodRange } from "../domain/period";
import type { Activity } from "../domain/types";
import { formatDuration } from "../domain/units";

interface DayBreakdownProps {
  period: PeriodRange;
  activities: Activity[];
  /** Répartition par sport de la période affichée, en titre du cadre (ex. « Course à pied 2, vélo 0 »). */
  title: string;
}

type DayState = "future" | "empty" | "active";

/** Répartition jour par jour de la semaine en cours (CA2.7). Chaque état a son propre texte (CA2.8, ENF6). */
export function DayBreakdown({ period, activities, title }: DayBreakdownProps) {
  if (period.kind !== "current-week" || period.start === null) {
    return null;
  }

  const today = startOfDay(new Date());
  const weekStart = period.start;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const dayEntries = days.map((day) => {
    const dayActivities = activities.filter((activity) => isSameDay(activity.startedAtLocal, day));
    const summary = summarize(dayActivities);
    const state: DayState = isAfter(startOfDay(day), today)
      ? "future"
      : dayActivities.length > 0
        ? "active"
        : "empty";
    return { day, summary, state };
  });

  // La barre la plus haute correspond à la plus grande distance du jour parmi les jours actifs affichés.
  const maxDistance = Math.max(
    0,
    ...dayEntries.filter((entry) => entry.state === "active").map((entry) => entry.summary.totalDistance),
  );

  return (
    <div className="card">
      <p className="label">{title}</p>
      <ul className="day-breakdown-list">
        {dayEntries.map(({ day, summary, state }) => {
          const barScale = maxDistance > 0 ? summary.totalDistance / maxDistance : 1;
          const barHeight = 8 + barScale * 56;

          return (
            <li key={day.toISOString()} data-state={state}>
              <div className="day-bar">
                <div
                  className="day-bar-fill"
                  style={state === "active" ? { height: `${barHeight}px` } : undefined}
                />
              </div>
              <p>{format(day, "EEE", { locale: fr })}</p>
              <p>
                {state === "future"
                  ? "à venir"
                  : state === "empty"
                    ? "aucune sortie"
                    : `${(summary.totalDistance / 1000).toFixed(1)} km · ${formatDuration(summary.totalMovingTime) ?? "—"}`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
