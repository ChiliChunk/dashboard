import { useMemo, useState } from "react";
import { format, isSameISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { planWeekNumberAt, planWeekRange } from "../domain/plan";

export interface PlanWeekSelection {
  /** Numéro de la semaine de plan détaillée (1 à 12). */
  number: number;
  select: (weekNumber: number) => void;
  /** Lundi de cette semaine. */
  start: Date;
  end: Date;
  /** Bornes en toutes lettres, pour le bandeau : « 3 août – 9 août ». */
  label: string;
  /** Vrai quand la semaine détaillée est celle qu'on est en train de vivre. */
  isCurrent: boolean;
}

/**
 * Semaine du plan actuellement détaillée. Elle est tenue au-dessus des routes
 * parce que deux endroits éloignés la partagent : le bandeau, qui en affiche
 * les dates, et la répartition par jour, qui en montre le détail. Seule la
 * bande du plan la change.
 */
export function usePlanWeekSelection(): PlanWeekSelection {
  const currentNumber = useMemo(() => planWeekNumberAt(new Date()), []);
  // Hors des 12 semaines du plan, la sélection retombe sur la première plutôt
  // que sur rien, comme la bande du plan elle-même.
  const [number, setNumber] = useState(currentNumber ?? 1);

  return useMemo(() => {
    const { start, end } = planWeekRange(number);
    return {
      number,
      select: setNumber,
      start,
      end,
      label: `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM", { locale: fr })}`,
      isCurrent: isSameISOWeek(start, new Date()),
    };
  }, [number]);
}
