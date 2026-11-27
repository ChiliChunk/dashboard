import { format, startOfISOWeek } from "date-fns";

/**
 * Le renfo est la seule chose du plan qu'aucune montre ne mesure : il n'arrive
 * pas dans les activités Garmin (c'est du gainage au sol, pas une sortie), et
 * la synchronisation n'en saura donc jamais rien. Il se pointe à la main, et
 * ce pointage vit à côté des activités, dans le même stockage local.
 */

/** Une semaine pointée. Rien n'est stocké pour une semaine non faite : l'absence vaut « pas fait ». */
export interface RenfoEntry {
  /** Clé de semaine, voir `renfoWeekKey`. */
  weekKey: string;
  /** Instant du pointage, pour pouvoir un jour dire « coché le… ». */
  doneAt: number;
}

/**
 * Clé d'une semaine dans le journal : le lundi de sa semaine ISO en date
 * locale (`2026-11-30`). C'est la semaine du calendrier qui est pointée, pas
 * la semaine de plan — un numéro de semaine de plan ne survivrait ni à un
 * changement de plan ni à un décalage de ses semaines, alors qu'un lundi, oui.
 */
export function renfoWeekKey(date: Date): string {
  return format(startOfISOWeek(date), "yyyy-MM-dd");
}

export function toRenfoDoneSet(entries: RenfoEntry[]): Set<string> {
  return new Set(entries.map((entry) => entry.weekKey));
}

export function isRenfoDoneAt(done: ReadonlySet<string>, date: Date): boolean {
  return done.has(renfoWeekKey(date));
}

/** Nombre de semaines pointées parmi celles données — le reste du journal (autres plans) ne compte pas. */
export function renfoDoneCount(done: ReadonlySet<string>, weeks: { start: Date }[]): number {
  return weeks.filter((week) => isRenfoDoneAt(done, week.start)).length;
}
