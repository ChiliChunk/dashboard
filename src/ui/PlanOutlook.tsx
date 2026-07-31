import { useMemo, useState } from "react";
import { isWithinInterval } from "date-fns";
import {
  PLAN_OBJECTIVE,
  PLAN_WEEKS,
  planProgress,
  planWeekNumberAt,
  planWeekRange,
} from "../domain/plan";
import type { Activity } from "../domain/types";
import { formatDuration, formatElevation } from "../domain/units";

/** Hauteur, en pixels, de la barre correspondant à la plus grosse cible du plan. */
const BAR_MAX_HEIGHT = 84;
/** Une cible minuscule reste visible plutôt que d'être écrasée à rien. */
const BAR_MIN_HEIGHT = 6;

type WeekState = "past" | "current" | "future";

const DURATION_CEILING = Math.max(...PLAN_WEEKS.map((week) => week.targetDuration));
const ELEVATION_CEILING = Math.max(...PLAN_WEEKS.map((week) => week.targetElevationGain));

function barHeight(value: number, ceiling: number): number {
  return BAR_MIN_HEIGHT + (value / ceiling) * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
}

/** Part réalisée d'une cible, plafonnée : au-delà de 100 % la barre est simplement pleine. */
function fillRatio(done: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, done / target);
}

interface PlanOutlookProps {
  activities: Activity[];
}

/**
 * Les 12 semaines du plan d'un seul coup d'œil : chaque semaine porte ses deux
 * cibles côte à côte (heures à pied, D+ à pied), hautes proportionnellement à
 * la plus grosse cible du plan — la forme du bloc se lit donc directement.
 * Les semaines écoulées et la semaine en cours montrent en plus la part déjà
 * réalisée, ce qui met le reste à faire dans le même cadre que ce qui vient.
 *
 * Chaque semaine est un bouton : le détail affiché dessous suit la sélection,
 * ce qui permet d'aller voir ce qui attend sans quitter la page.
 */
export function PlanOutlook({ activities }: PlanOutlookProps) {
  const currentNumber = useMemo(() => planWeekNumberAt(new Date()), []);
  // Hors plan, la sélection retombe sur la première semaine plutôt que sur rien.
  const [selected, setSelected] = useState(currentNumber ?? 1);

  const weeks = useMemo(() => {
    return PLAN_WEEKS.map((week, index) => {
      const range = planWeekRange(week.number);
      const state: WeekState =
        currentNumber === null
          ? "future"
          : week.number < currentNumber
            ? "past"
            : week.number === currentNumber
              ? "current"
              : "future";

      const progress =
        state === "future"
          ? null
          : planProgress(
              week,
              activities.filter((activity) =>
                isWithinInterval(activity.startedAtLocal, { start: range.start, end: range.end }),
              ),
            );

      return {
        week,
        state,
        progress,
        // Un filet sépare les blocs : le plan se lit alors par phases, pas comme 12 semaines interchangeables.
        startsBlock: index > 0 && PLAN_WEEKS[index - 1]?.block !== week.block,
      };
    });
  }, [activities, currentNumber]);

  const detail = weeks.find((entry) => entry.week.number === selected) ?? weeks[0];
  if (detail === undefined) return null;

  const { week, progress } = detail;
  const hasOptional =
    week.optionalDuration !== week.targetDuration ||
    week.optionalElevationGain !== week.targetElevationGain;

  return (
    <div className="card plan-outlook">
      <div className="plan-outlook-head">
        <p className="label">Plan · {PLAN_OBJECTIVE.name}</p>
        <p className="caption plan-legend">
          <span className="plan-swatch" data-metric="duration" aria-hidden="true" /> heures
          <span className="plan-swatch" data-metric="elevation" aria-hidden="true" /> D+
          <span className="muted">barre = cible, partie pleine = réalisé</span>
        </p>
      </div>

      <ol className="plan-strip">
        {weeks.map((entry) => (
          <li key={entry.week.number} data-block-start={entry.startsBlock ? "true" : undefined}>
            <button
              type="button"
              className="plan-week"
              data-state={entry.state}
              aria-pressed={entry.week.number === selected}
              onClick={() => setSelected(entry.week.number)}
            >
              <span className="plan-bars">
                <span
                  className="plan-bar"
                  data-metric="duration"
                  style={{ height: `${barHeight(entry.week.targetDuration, DURATION_CEILING)}px` }}
                >
                  {entry.progress && (
                    <span
                      className="plan-bar-done"
                      style={{
                        height: `${fillRatio(entry.progress.duration, entry.week.targetDuration) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span
                  className="plan-bar"
                  data-metric="elevation"
                  style={{
                    height: `${barHeight(entry.week.targetElevationGain, ELEVATION_CEILING)}px`,
                  }}
                >
                  {entry.progress && (
                    <span
                      className="plan-bar-done"
                      style={{
                        height: `${fillRatio(entry.progress.elevationGain, entry.week.targetElevationGain) * 100}%`,
                      }}
                    />
                  )}
                </span>
              </span>
              <span className="plan-week-number">S{entry.week.number}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="plan-detail">
        <p className="plan-detail-targets">
          <strong>{formatDuration(week.targetDuration)}</strong>
          <strong>{formatElevation(week.targetElevationGain)} D+</strong>
          {progress && (
            <span className="caption muted">
              réalisé {formatDuration(progress.duration)} ·{" "}
              {formatElevation(progress.elevationGain)}
            </span>
          )}
        </p>
        <p className="caption">
          Semaine {week.number} sur {PLAN_WEEKS.length}
          {week.number === currentNumber ? " (en cours)" : ""} · {week.block} ·{" "}
          {week.footOutings} sorties à pied · plafond {formatDuration(week.totalDurationCeiling)}{" "}
          toutes activités
          {hasOptional
            ? ` · avec la sortie optionnelle à pied : ${formatDuration(week.optionalDuration)} et ${formatElevation(week.optionalElevationGain)}`
            : ""}
        </p>
        {week.note && <p className="caption muted">{week.note}</p>}
      </div>
    </div>
  );
}
