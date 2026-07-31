import { useState } from "react";
import { addDays, format, isAfter, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { summarize, summarizeBySport, type PeriodSummary } from "../domain/aggregate";
import type { PeriodRange } from "../domain/period";
import type { Activity, SportKind } from "../domain/types";
import { formatDuration } from "../domain/units";

interface DayBreakdownProps {
  period: PeriodRange;
  activities: Activity[];
}

type DayState = "future" | "empty" | "active";
/** Grandeur qui donne sa hauteur aux barres — au choix de l'utilisateur. */
type DayMetric = "distance" | "duration";

const SPORT_ORDER: SportKind[] = ["run", "ride", "hike", "other"];
const SPORT_LABELS: Record<SportKind, string> = {
  run: "Course à pied",
  ride: "Vélo",
  hike: "Randonnée",
  other: "Autre",
};

function metricValue(summary: PeriodSummary, metric: DayMetric): number {
  return metric === "distance" ? summary.totalDistance : summary.totalDuration;
}

/** Répartition jour par jour de la semaine en cours (CA2.7). Chaque état a son propre texte (CA2.8, ENF6). */
export function DayBreakdown({ period, activities }: DayBreakdownProps) {
  const [metric, setMetric] = useState<DayMetric>("distance");

  if (period.kind !== "current-week" || period.start === null) {
    return null;
  }

  const today = startOfDay(new Date());
  const weekStart = period.start;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const dayEntries = days.map((day) => {
    const dayActivities = activities.filter((activity) => isSameDay(activity.startedAtLocal, day));
    const summary = summarize(dayActivities);
    const bySport = summarizeBySport(dayActivities);
    const state: DayState = isAfter(startOfDay(day), today)
      ? "future"
      : dayActivities.length > 0
        ? "active"
        : "empty";
    return { day, summary, bySport, state };
  });

  // La barre la plus haute correspond à la plus grande valeur du jour, dans la
  // grandeur choisie, parmi les jours actifs affichés.
  const maxValue = Math.max(
    0,
    ...dayEntries
      .filter((entry) => entry.state === "active")
      .map((entry) => metricValue(entry.summary, metric)),
  );

  // Légende : seuls les sports effectivement pratiqués dans la semaine, pour que
  // chaque teinte de barre soit décodable sans quitter le cadre.
  const weekBySport = summarizeBySport(activities);
  const legend = SPORT_ORDER.filter((sport) => weekBySport[sport].count > 0);

  return (
    <div className="card">
      <div className="day-breakdown-head">
        <p className="label">
          Répartition
          {legend.length === 0 ? (
            <> : aucune sortie</>
          ) : (
            <span className="sport-legend">
              {legend.map((sport) => (
                <span key={sport} className="sport-legend-item">
                  <span className="sport-swatch" data-sport={sport} aria-hidden="true" />
                  {SPORT_LABELS[sport]} {weekBySport[sport].count}
                </span>
              ))}
            </span>
          )}
        </p>
        <div className="metric-toggle" role="group" aria-label="Grandeur des barres">
          <button
            type="button"
            aria-pressed={metric === "distance"}
            onClick={() => setMetric("distance")}
          >
            km
          </button>
          <button
            type="button"
            aria-pressed={metric === "duration"}
            onClick={() => setMetric("duration")}
          >
            heures
          </button>
        </div>
      </div>

      <ul className="day-breakdown-list">
        {dayEntries.map(({ day, summary, bySport, state }) => {
          const dayValue = metricValue(summary, metric);
          const barScale = maxValue > 0 ? dayValue / maxValue : 1;
          const barHeight = 8 + barScale * 56;
          const segments = SPORT_ORDER.filter((sport) => metricValue(bySport[sport], metric) > 0);

          const distanceText = `${(summary.totalDistance / 1000).toFixed(1)} km`;
          const durationText = formatDuration(summary.totalDuration) ?? "—";

          return (
            <li key={day.toISOString()} data-state={state}>
              <div className="day-bar">
                <div
                  className="day-bar-fill"
                  style={state === "active" ? { height: `${barHeight}px` } : undefined}
                >
                  {state === "active" &&
                    segments.map((sport) => (
                      <span
                        key={sport}
                        className="day-bar-seg"
                        data-sport={sport}
                        style={{ flexGrow: metricValue(bySport[sport], metric) }}
                        title={`${SPORT_LABELS[sport]} : ${
                          metric === "distance"
                            ? `${(bySport[sport].totalDistance / 1000).toFixed(1)} km`
                            : (formatDuration(bySport[sport].totalDuration) ?? "—")
                        }`}
                      />
                    ))}
                </div>
              </div>
              <p>{format(day, "EEE", { locale: fr })}</p>
              <p>
                {state === "future"
                  ? "à venir"
                  : state === "empty"
                    ? "aucune sortie"
                    : metric === "distance"
                      ? `${distanceText} · ${durationText}`
                      : `${durationText} · ${distanceText}`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
