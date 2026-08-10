import { useMemo } from "react";
import { isWithinInterval } from "date-fns";
import {
  PLAN_OBJECTIVE,
  PLAN_WEEKS,
  planProgress,
  planWeekNumberAt,
  planWeekRange,
} from "../domain/plan";
import type { Activity } from "../domain/types";
import { formatDuration, formatElevationValue } from "../domain/units";

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
  /** Semaine sélectionnée, tenue par le parent : la répartition par jour affichée au-dessus suit la même. */
  selected: number;
  onSelect: (weekNumber: number) => void;
}

/**
 * Les 12 semaines du plan d'un seul coup d'œil : chaque semaine porte ses deux
 * cibles côte à côte (heures à pied, D+ à pied), hautes proportionnellement à
 * la plus grosse cible du plan — la forme du bloc se lit donc directement.
 * Les semaines écoulées et la semaine en cours montrent en plus la part déjà
 * réalisée, ce qui met le reste à faire dans le même cadre que ce qui vient.
 *
 * Chaque semaine est un bouton : le détail affiché dessous suit la sélection,
 * ainsi que la répartition par jour affichée au-dessus — d'où une sélection
 * tenue par le parent plutôt qu'ici.
 */
export function PlanOutlook({ activities, selected, onSelect }: PlanOutlookProps) {
  const currentNumber = useMemo(() => planWeekNumberAt(new Date()), []);

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

  const { week } = detail;
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
              onClick={() => onSelect(entry.week.number)}
              aria-label={`Semaine ${entry.week.number}${entry.progress?.status === "both" ? ", objectifs atteints" : ""}`}
            >
              {/* Toujours rendu, même vide : la ligne réservée garde les barres
                  des douze semaines sur la même base, seul ce qui les distingue
                  doit se voir. */}
              <span className="plan-week-check" aria-hidden="true">
                {entry.progress?.status === "both" ? "✓" : ""}
              </span>
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
        {/* Le réalisé précède la cible, séparé d'une barre : la semaine se lit
            d'un coup comme « où j'en suis sur ce qui est demandé », sans avoir
            à retrouver l'information dans les cartes du haut. Une semaine à
            venir n'a rien de réalisé à montrer, elle garde la seule cible. */}
        <p className="plan-detail-targets">
          <strong>
            {detail.progress && (
              <span className="plan-detail-done">{formatDuration(detail.progress.duration)} / </span>
            )}
            {formatDuration(week.targetDuration)}
          </strong>
          <strong>
            {detail.progress && (
              <span className="plan-detail-done">
                {formatElevationValue(detail.progress.elevationGain)} /{" "}
              </span>
            )}
            {formatElevationValue(week.targetElevationGain)} D+
          </strong>
        </p>
        <p className="caption">
          Semaine {week.number} sur {PLAN_WEEKS.length}
          {week.number === currentNumber ? " (en cours)" : ""} · {week.block} ·{" "}
          {week.footOutings} sorties à pied · plafond {formatDuration(week.totalDurationCeiling)}{" "}
          toutes activités
          {hasOptional
            ? ` · avec la sortie optionnelle à pied : ${formatDuration(week.optionalDuration)} et ${formatElevationValue(week.optionalElevationGain)} D+`
            : ""}
        </p>
        {week.note && <p className="caption muted">{week.note}</p>}
      </div>
    </div>
  );
}
