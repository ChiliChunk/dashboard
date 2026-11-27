import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { finishedPlansAt, planById, planWeekByNumber, type Plan } from "../domain/plan";
import type { Activity } from "../domain/types";
import { useRenfoLog } from "../data/renfoLog";
import { PlanOutlook } from "./PlanOutlook";

interface PlanHistoryProps {
  activities: Activity[];
}

/** Un plan terminé s'ouvre sur sa dernière semaine : c'est celle où il s'est arrêté. */
function lastWeekNumber(plan: Plan): number {
  return plan.weeks.length;
}

/**
 * Les plans terminés, avec leurs cibles d'alors et ce qui a réellement été
 * fait sous elles. C'est une page à part, et non un onglet du tableau de bord :
 * un plan passé ne se consulte pas en même temps qu'on lit sa semaine en
 * cours, et le mélanger au plan courant invite à comparer des cibles qui
 * n'avaient pas le même objectif.
 *
 * La sélection de semaine est locale, contrairement à celle du tableau de
 * bord : rien d'autre sur cette page ne la suit, et fouiller un plan passé ne
 * doit pas déplacer la semaine qu'on avait ouverte sur l'accueil.
 */
export function PlanHistory({ activities }: PlanHistoryProps) {
  const renfo = useRenfoLog();
  const today = useMemo(() => new Date(), []);
  const plans = useMemo(() => finishedPlansAt(today), [today]);

  // Le plus récent d'abord : c'est celui qu'on vient relire.
  const ordered = useMemo(() => [...plans].reverse(), [plans]);
  const first = ordered[0];

  const [selection, setSelection] = useState(() =>
    first ? { planId: first.id, number: lastWeekNumber(first) } : null,
  );

  const onSelect = useCallback((planId: string, weekNumber: number) => {
    setSelection({ planId, number: weekNumber });
  }, []);

  if (first === undefined || selection === null) {
    return (
      <div className="card">
        <p className="label">Historique</p>
        <p className="caption muted">
          Aucun plan terminé pour l'instant : le plan en cours se lit sur le tableau de bord.
        </p>
      </div>
    );
  }

  const plan = planById(selection.planId) ?? first;
  const week = planWeekByNumber(plan, selection.number);

  return (
    <div className="stack">
      <div className="card">
        <p className="label">Historique</p>
        <p className="caption muted">
          {ordered.length === 1 ? "Plan terminé" : `${ordered.length} plans terminés`}, avec les
          cibles d'alors et ce qui a été fait dessous. Les activités, elles, restent toutes dans la
          liste du tableau de bord.
        </p>
      </div>

      <PlanOutlook
        activities={activities}
        plans={ordered}
        plan={plan}
        selectedWeek={week === null ? lastWeekNumber(plan) : week.number}
        onSelect={onSelect}
        renfo={renfo}
      />

      <div className="card">
        <p className="label">{plan.name}</p>
        <p className="caption muted">
          {plan.weeks.length} semaines, du {format(plan.start, "d MMMM yyyy", { locale: fr })} au{" "}
          {format(plan.end, "d MMMM yyyy", { locale: fr })}.
          {plan.objectives.map((objective) => {
            const parts = [
              objective.distanceKm === null ? null : `${objective.distanceKm} km`,
              objective.elevationGain === null ? null : `${objective.elevationGain} m D+`,
              objective.estimatedTime === null ? null : `estimé ${objective.estimatedTime}`,
            ].filter((part) => part !== null);
            return parts.length === 0
              ? null
              : ` Objectif : ${objective.name} — ${parts.join(", ")}.`;
          })}
        </p>
      </div>
    </div>
  );
}
