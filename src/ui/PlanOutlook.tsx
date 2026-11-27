import { useMemo } from "react";
import { format, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import {
  PLANS,
  planProgress,
  planWeekNumberAt,
  planWeekRange,
  renfoCircuitFor,
  type Plan,
  type PlanWeek,
} from "../domain/plan";
import { isRenfoDoneAt, renfoDoneCount } from "../domain/renfo";
import type { Activity } from "../domain/types";
import { formatDuration, formatElevationValue } from "../domain/units";
import type { RenfoLogSnapshot } from "../data/renfoLog";
import type { PlanWeekSelection } from "./planWeek";

/** Hauteur, en pixels, de la barre correspondant à la plus grosse cible du plan. */
const BAR_MAX_HEIGHT = 84;
/** Une cible minuscule reste visible plutôt que d'être écrasée à rien. */
const BAR_MIN_HEIGHT = 6;

type WeekState = "past" | "current" | "future";

function barHeight(value: number, ceiling: number): number {
  if (ceiling <= 0) return BAR_MIN_HEIGHT;
  return BAR_MIN_HEIGHT + (value / ceiling) * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
}

/** Part réalisée d'une cible, plafonnée : au-delà de 100 % la barre est simplement pleine. */
function fillRatio(done: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, done / target);
}

/** Le plan énonce le contenu d'une semaine en une ligne séparée par des points médians. */
function splitKeyWorkouts(keyWorkouts: string): string[] {
  return keyWorkouts
    .split("·")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Les objectifs datés du plan, en une ligne. `flatMap` plutôt qu'un `filter` :
 * il restreint le type en même temps qu'il écarte les objectifs sans date, là
 * où un `filter` obligerait à réaffirmer à la main que la date est là.
 */
function objectiveLabel(plan: Plan): string | null {
  const dated = plan.objectives.flatMap((objective) =>
    objective.date === null ? [] : [{ name: objective.name, date: objective.date }],
  );
  if (dated.length === 0) return null;
  return dated
    .map(
      (objective) =>
        `${objective.name} — ${format(objective.date, "EEEE d MMMM yyyy", { locale: fr })}`,
    )
    .join(" · ");
}

interface PlanOutlookProps {
  activities: Activity[];
  /** Semaine et plan détaillés, tenus par le parent : la répartition par jour affichée au-dessus suit la même semaine. */
  planWeek: PlanWeekSelection;
  renfo: RenfoLogSnapshot;
}

/**
 * Les semaines du plan d'un seul coup d'œil : chaque semaine porte ses deux
 * cibles côte à côte (heures à pied, D+ à pied), hautes proportionnellement à
 * la plus grosse cible du plan — la forme du bloc se lit donc directement.
 * Les semaines écoulées et la semaine en cours montrent en plus la part déjà
 * réalisée, ce qui met le reste à faire dans le même cadre que ce qui vient.
 *
 * Chaque semaine est un bouton : le détail affiché dessous suit la sélection,
 * ainsi que la répartition par jour affichée au-dessus — d'où une sélection
 * tenue par le parent plutôt qu'ici. Les plans précédents se relisent par les
 * onglets du haut, avec leurs cibles d'alors.
 */
export function PlanOutlook({ activities, planWeek, renfo }: PlanOutlookProps) {
  const today = useMemo(() => new Date(), []);
  const plan = planWeek.plan;
  const currentNumber = useMemo(() => planWeekNumberAt(plan, today), [plan, today]);

  const ceilings = useMemo(
    () => ({
      duration: Math.max(...plan.weeks.map((week) => week.targetDuration)),
      elevation: Math.max(...plan.weeks.map((week) => week.targetElevationGain)),
    }),
    [plan],
  );

  const weeks = useMemo(() => {
    return plan.weeks.map((week: PlanWeek, index: number) => {
      const range = planWeekRange(week);
      // L'état se lit du calendrier et non du numéro de semaine en cours : un
      // plan terminé n'a pas de semaine en cours, et toutes ses semaines sont
      // bien passées — avec leur réalisé, qu'il reste intéressant de relire.
      const state: WeekState =
        today > range.end ? "past" : today < range.start ? "future" : "current";

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
        renfoDone: week.renfo !== null && isRenfoDoneAt(renfo.done, week.start),
        // Un filet sépare les blocs : le plan se lit alors par phases, pas comme des semaines interchangeables.
        startsBlock: index > 0 && plan.weeks[index - 1]?.block !== week.block,
      };
    });
  }, [activities, plan, renfo.done, today]);

  const detail = weeks.find((entry) => entry.week.number === planWeek.number) ?? weeks[0];
  if (detail === undefined) return null;

  const { week } = detail;
  const hasOptional =
    week.optionalDuration !== null &&
    week.optionalElevationGain !== null &&
    (week.optionalDuration !== week.targetDuration ||
      week.optionalElevationGain !== week.targetElevationGain);

  const circuit = renfoCircuitFor(plan, week);
  const renfoWeeks = plan.weeks.filter((candidate) => candidate.renfo !== null);
  const renfoDone = renfoDoneCount(renfo.done, renfoWeeks);
  const objectives = objectiveLabel(plan);

  return (
    <div className="card plan-outlook">
      <div className="plan-outlook-head">
        <p className="label">Plan · {plan.name}</p>
        <p className="caption plan-legend">
          <span className="plan-swatch" data-metric="duration" aria-hidden="true" /> heures
          <span className="plan-swatch" data-metric="elevation" aria-hidden="true" /> D+
        </p>
      </div>

      {/* Les plans précédents ne sont pas supprimés : leurs semaines gardent
          les cibles sous lesquelles elles ont été courues, et se relisent ici. */}
      {PLANS.length > 1 && (
        <div className="plan-tabs" role="group" aria-label="Plan affiché">
          {PLANS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="plan-tab"
              aria-pressed={candidate.id === plan.id}
              onClick={() => planWeek.select(candidate.id, planWeekNumberAt(candidate, today) ?? 1)}
            >
              {candidate.name}
              <span className="caption muted">
                {format(candidate.start, "MMM yyyy", { locale: fr })} –{" "}
                {format(candidate.end, "MMM yyyy", { locale: fr })}
              </span>
            </button>
          ))}
        </div>
      )}

      {objectives && <p className="caption muted">{objectives}</p>}

      <ol className="plan-strip">
        {weeks.map((entry) => (
          <li key={entry.week.number} data-block-start={entry.startsBlock ? "true" : undefined}>
            <button
              type="button"
              className="plan-week"
              data-state={entry.state}
              aria-pressed={entry.week.number === planWeek.number}
              onClick={() => planWeek.select(plan.id, entry.week.number)}
              aria-label={`Semaine ${entry.week.number}${entry.progress?.status === "both" ? ", objectifs atteints" : ""}${entry.week.renfo === null ? "" : entry.renfoDone ? ", renfo fait" : ", renfo à faire"}`}
            >
              {/* Toujours rendu, même vide : la ligne réservée garde les barres
                  de toutes les semaines sur la même base, seul ce qui les
                  distingue doit se voir. */}
              <span className="plan-week-check" aria-hidden="true">
                {entry.progress?.status === "both" ? "✓" : ""}
              </span>
              <span className="plan-bars">
                <span
                  className="plan-bar"
                  data-metric="duration"
                  style={{ height: `${barHeight(entry.week.targetDuration, ceilings.duration)}px` }}
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
                    height: `${barHeight(entry.week.targetElevationGain, ceilings.elevation)}px`,
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
              {/* Pastille de renfo, toujours rendue pour la même raison que la
                  coche : un plan sans renfo garde la même ligne de base. */}
              <span
                className="plan-week-renfo"
                data-renfo={
                  entry.week.renfo === null ? "none" : entry.renfoDone ? "done" : "todo"
                }
                aria-hidden="true"
              />
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
          Semaine {week.number} sur {plan.weeks.length}
          {week.number === currentNumber ? " (en cours)" : ""} · {week.block} · {week.sessions}{" "}
          {plan.sessionsLabel}
          {week.totalDurationCeiling !== null
            ? ` · plafond ${formatDuration(week.totalDurationCeiling)} toutes activités`
            : ""}
          {hasOptional
            ? ` · avec la sortie optionnelle à pied : ${formatDuration(week.optionalDuration)} et ${formatElevationValue(week.optionalElevationGain)} D+`
            : ""}
        </p>

        {week.keyWorkouts && (
          <ul className="plan-workouts">
            {splitKeyWorkouts(week.keyWorkouts).map((workout) => (
              <li key={workout}>{workout}</li>
            ))}
          </ul>
        )}

        {week.renfo && (
          <div className="plan-renfo">
            <div className="plan-renfo-line">
              {/* La case est l'unique façon de savoir si le renfo a été fait :
                  il ne vient d'aucune montre (voir src/domain/renfo.ts). Une
                  semaine à venir n'a rien à pointer, sa case est inerte. */}
              <label className="plan-renfo-check">
                <input
                  type="checkbox"
                  checked={detail.renfoDone}
                  disabled={detail.state === "future" || !renfo.ready}
                  onChange={(event) => renfo.toggle(week.start, event.target.checked)}
                />
                <span>
                  Renfo {detail.state === "current" ? "fait cette semaine" : "fait"}
                  {detail.state === "future" ? " (semaine à venir)" : ""}
                </span>
              </label>
              <Link href="/renfo" className="plan-renfo-link caption">
                Voir les circuits
              </Link>
            </div>
            <p className="caption muted">
              {week.renfo.instruction}
              {circuit ? ` · ${circuit.format}` : ""}
            </p>
            <p className="caption muted">
              {renfoDone} semaine{renfoDone > 1 ? "s" : ""} pointée{renfoDone > 1 ? "s" : ""} sur{" "}
              {renfoWeeks.length} du plan
            </p>
          </div>
        )}

        {week.note && <p className="caption muted">{week.note}</p>}
      </div>
    </div>
  );
}
