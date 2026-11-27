import { useCallback, useMemo, useState } from "react";
import { format, isSameISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  activePlanAt,
  planById,
  planWeekByNumber,
  planWeekNumberAt,
  planWeekRange,
  type Plan,
  type PlanWeek,
} from "../domain/plan";

export interface PlanWeekSelection {
  /** Plan détaillé : pas toujours celui en cours, l'ancien plan reste consultable. */
  plan: Plan;
  /** Numéro de la semaine détaillée, dans ce plan. */
  number: number;
  week: PlanWeek;
  select: (planId: string, weekNumber: number) => void;
  /** Lundi de cette semaine. */
  start: Date;
  end: Date;
  /** Bornes en toutes lettres, pour le bandeau : « 3 août – 9 août ». */
  label: string;
  /** Vrai quand la semaine détaillée est celle qu'on est en train de vivre. */
  isCurrent: boolean;
}

/** Un plan a toujours des semaines : un plan vide est un document cassé, pas un cas à afficher. */
function resolveWeek(plan: Plan, number: number): PlanWeek {
  const week = planWeekByNumber(plan, number) ?? plan.weeks[0];
  if (week === undefined) throw new Error(`Plan sans semaine : ${plan.id}`);
  return week;
}

/**
 * Semaine du plan actuellement détaillée. Elle est tenue au-dessus des routes
 * parce que deux endroits éloignés la partagent : le bandeau, qui en affiche
 * les dates, et la répartition par jour, qui en montre le détail. La bande du
 * plan la change, et peut aussi changer de plan — d'où le plan dans la
 * sélection, et pas seulement un numéro.
 */
export function usePlanWeekSelection(): PlanWeekSelection {
  const today = useMemo(() => new Date(), []);
  const [selection, setSelection] = useState(() => {
    const plan = activePlanAt(today);
    // Hors des semaines du plan, la sélection retombe sur la première plutôt
    // que sur rien, comme la bande du plan elle-même.
    return { planId: plan.id, number: planWeekNumberAt(plan, today) ?? 1 };
  });

  const select = useCallback((planId: string, weekNumber: number) => {
    setSelection({ planId, number: weekNumber });
  }, []);

  return useMemo(() => {
    const plan = planById(selection.planId) ?? activePlanAt(today);
    const week = resolveWeek(plan, selection.number);
    const { start, end } = planWeekRange(week);
    return {
      plan,
      number: week.number,
      week,
      select,
      start,
      end,
      label: `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM", { locale: fr })}`,
      isCurrent: isSameISOWeek(start, today),
    };
  }, [selection, select, today]);
}
