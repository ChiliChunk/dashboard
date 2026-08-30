import { differenceInCalendarISOWeeks, endOfISOWeek, startOfISOWeek } from "date-fns";
import planDocument from "./plan_trail_44k_1500d.json";
import type { Activity } from "./types";

/**
 * Le plan est un document figé, versionné avec le code
 * (`plan_trail_44k_1500d.json`) : il n'est ni synchronisé ni recalculé. Trois
 * valeurs par semaine seulement en sont extraites — les deux cibles (heures à
 * pied, D+ à pied) et le plafond d'heures toutes activités confondues. Le
 * reste du document (règles, stratégie de course, densités) reste consultable
 * dans le fichier mais n'entre dans aucun calcul : le plan ne pilote que deux
 * grandeurs, délibérément.
 */

export interface PlanWeek {
  /** 1 à 12. */
  number: number;
  block: string;
  weekType: string;
  footOutings: number;
  /**
   * Cible d'heures de course à pied, en secondes. C'est le compteur `base` du
   * document : le contrat minimum des 3 sorties obligatoires, pas le total
   * avec la sortie optionnelle.
   */
  targetDuration: number;
  /** Cible de D+ de course à pied, en mètres, sur ces mêmes 3 sorties. */
  targetElevationGain: number;
  /** Totaux si la sortie optionnelle est courue à pied : un bonus, jamais la cible. */
  optionalDuration: number;
  optionalElevationGain: number;
  /**
   * Plafond d'heures, tous sports confondus, en secondes. Une limite haute à
   * ne pas dépasser — surtout pas une cible à atteindre.
   */
  totalDurationCeiling: number;
  note: string | null;
}

export const PLAN_OBJECTIVE = {
  name: planDocument.meta.objectif.nom,
  distanceKm: planDocument.meta.objectif.distance_km,
  elevationGain: planDocument.meta.objectif.denivele_positif_m,
  estimatedTime: planDocument.meta.objectif.temps_estime_fourchette,
};

export const PLAN_WEEKS: PlanWeek[] = planDocument.semaines.map((week) => ({
  number: week.numero,
  block: week.bloc,
  weekType: week.type_semaine,
  footOutings: week.sorties_pied,
  targetDuration: week.base.duree_min * 60,
  targetElevationGain: week.base.dplus,
  optionalDuration: week.avec_optionnelle.duree_min * 60,
  optionalElevationGain: week.avec_optionnelle.dplus,
  totalDurationCeiling: Math.round(week.heures_totales_max * 3600),
  note: week.note,
}));

/**
 * Lundi de la semaine 1. En dur, parce que le plan est daté : généré le
 * 2026-07-31, un jour où sa semaine 1 était déjà commencée. Construit en heure
 * locale, comme `Activity.startedAtLocal` auquel il est comparé.
 */
export const PLAN_START = startOfISOWeek(new Date(2026, 6, 27));

/** Numéro de semaine de plan couvrant cette date, ou `null` hors des 12 semaines. */
export function planWeekNumberAt(date: Date): number | null {
  const offset = differenceInCalendarISOWeeks(date, PLAN_START);
  if (offset < 0 || offset >= PLAN_WEEKS.length) return null;
  return offset + 1;
}

export function planWeekAt(date: Date): PlanWeek | null {
  const number = planWeekNumberAt(date);
  return number === null ? null : (PLAN_WEEKS[number - 1] ?? null);
}

/** Bornes calendaires (semaine ISO) de la n-ième semaine du plan. */
export function planWeekRange(number: number): { start: Date; end: Date } {
  const start = startOfISOWeek(new Date(PLAN_START));
  start.setDate(start.getDate() + (number - 1) * 7);
  return { start, end: endOfISOWeek(start) };
}

export type PlanQuotaStatus = "none" | "one" | "both";

export interface PlanProgress {
  week: PlanWeek;
  /**
   * Réalisé à pied : la course intégralement, la randonnée à moitié pour la
   * durée (voir `HIKE_DURATION_SHARE`). Le vélo n'y entre pas.
   */
  duration: number;
  /** D+ à pied : course et randonnée comptent pareil, mètre pour mètre. */
  elevationGain: number;
  durationMet: boolean;
  elevationMet: boolean;
  status: PlanQuotaStatus;
}

/**
 * Part de la durée d'une randonnée qui alimente la cible d'heures. Le D+ d'une
 * rando se gagne dans les mêmes jambes que celui d'une sortie courue, il compte
 * donc en entier ; le temps, lui, se marche à une intensité bien moindre —
 * l'amputer de moitié évite qu'une longue sortie tranquille ne solde le contrat
 * d'heures de la semaine.
 */
export const HIKE_DURATION_SHARE = 0.5;

/** Ce que la course et la rando comptent, en une phrase, pour l'expliquer dans l'interface. */
export const PLAN_COUNTING_RULE =
  "Les cibles du plan portent sur le travail à pied : la course compte en entier, la randonnée apporte tout son D+ mais seulement la moitié de son temps. Le vélo n'entre dans aucune des deux.";

/**
 * Avancement d'une semaine du plan, sur les seules sorties à pied — course et
 * randonnée. Le vélo reste dehors : il n'alimente ni les heures ni le D+ du
 * contrat de la semaine.
 */
export function planProgress(week: PlanWeek, activities: Activity[]): PlanProgress {
  let duration = 0;
  let elevationGain = 0;
  for (const activity of activities) {
    if (activity.sport !== "run" && activity.sport !== "hike") continue;
    const share = activity.sport === "hike" ? HIKE_DURATION_SHARE : 1;
    duration += (activity.duration ?? 0) * share;
    elevationGain += activity.elevationGain ?? 0;
  }

  const durationMet = duration >= week.targetDuration;
  const elevationMet = elevationGain >= week.targetElevationGain;
  const metCount = Number(durationMet) + Number(elevationMet);

  return {
    week,
    duration,
    elevationGain,
    durationMet,
    elevationMet,
    status: metCount === 2 ? "both" : metCount === 1 ? "one" : "none",
  };
}
