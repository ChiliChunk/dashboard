import { differenceInCalendarISOWeeks, endOfISOWeek, startOfISOWeek } from "date-fns";
import currentDocument from "./plan_semi_trail_44k_2500d.json";
import legacyDocument from "./plan_trail_44k_1500d.json";
import type { Activity } from "./types";

/**
 * Les plans sont des documents figés, versionnés avec le code : ils ne sont ni
 * synchronisés ni recalculés. Seules quelques valeurs par semaine en sont
 * extraites — les deux cibles (heures à pied, D+ à pied) et ce qui se montre
 * tel quel (contenu clé, renfo prescrit). Le reste du document (règles,
 * stratégie de course, densités) reste consultable dans le fichier mais
 * n'entre dans aucun calcul : le plan ne pilote que deux grandeurs,
 * délibérément.
 *
 * Il y en a plusieurs parce qu'un plan terminé n'est pas supprimé : les
 * semaines déjà vécues gardent les cibles sous lesquelles elles ont été
 * courues, et l'interface permet de les relire. Un plan remplacé ne perd donc
 * pas son histoire — c'est la raison d'être de `PLANS` plutôt que d'un plan
 * unique.
 */

export interface PlanObjective {
  name: string;
  /** Date de l'épreuve, quand le plan la fixe. L'ancien plan ne datait pas la sienne. */
  date: Date | null;
  distanceKm: number | null;
  elevationGain: number | null;
  estimatedTime: string | null;
}

/** Renfo prescrit pour une semaine, et le circuit de `Plan.renfoCircuits` qu'il désigne. */
export interface PlanWeekRenfo {
  circuitId: string;
  /** Durée telle que le plan l'écrit (« 25' », « 15-20' ») : ce n'est pas toujours un nombre. */
  duration: string;
  /** Consigne complète du plan, qui porte les nuances de calendrier (« lundi uniquement »). */
  instruction: string;
}

/** Un circuit de renforcement, avec ses exercices. Documentaire : rien ne s'en calcule. */
export interface RenfoCircuit {
  id: string;
  name: string;
  /** Semaines où le plan le programme, telles qu'il les énonce. */
  when: string;
  format: string;
  exercises: string[];
  progression: string | null;
  note: string | null;
}

export interface PlanWeek {
  planId: string;
  /** 1 à `plan.weeks.length`. */
  number: number;
  /** Lundi de la semaine, en heure locale comme `Activity.startedAtLocal`. */
  start: Date;
  /** Bloc (ancien plan) ou phase (plan courant) : ce qui regroupe les semaines voisines. */
  block: string;
  weekType: string | null;
  /** Nombre de séances prescrites. Voir `Plan.sessionsLabel` pour ce qu'elles comptent. */
  sessions: number;
  /**
   * Cible d'heures de course à pied, en secondes. Pour l'ancien plan, c'était
   * le compteur `base` du document : le contrat minimum des 3 sorties
   * obligatoires, pas le total avec la sortie optionnelle.
   */
  targetDuration: number;
  /** Cible de D+ de course à pied, en mètres. */
  targetElevationGain: number;
  /** Séances clés de la semaine, telles que le plan les énonce. `null` si le plan n'en prescrit aucune. */
  keyWorkouts: string | null;
  /** `null` pour un plan qui ne prescrit pas de renforcement, comme l'ancien. */
  renfo: PlanWeekRenfo | null;
  /** Totaux si la sortie optionnelle est courue à pied : un bonus, jamais la cible. Ancien plan seulement. */
  optionalDuration: number | null;
  optionalElevationGain: number | null;
  /**
   * Plafond d'heures, tous sports confondus, en secondes. Une limite haute à
   * ne pas dépasser — surtout pas une cible à atteindre. Ancien plan seulement.
   */
  totalDurationCeiling: number | null;
  note: string | null;
}

export interface Plan {
  id: string;
  /** Nom court, pour le sélecteur de plan. */
  name: string;
  objectives: PlanObjective[];
  /** Lundi de la semaine 1. */
  start: Date;
  /** Dimanche de la dernière semaine. */
  end: Date;
  weeks: PlanWeek[];
  /** Vide pour un plan qui ne prescrit pas de renforcement. */
  renfoCircuits: RenfoCircuit[];
  /** Ce que comptent les séances d'une semaine, pour l'écrire sans mentir (« séances », « sorties à pied »). */
  sessionsLabel: string;
}

/** Date ISO du document construite en heure locale : `new Date("2026-11-30")` est un instant UTC, qui peut tomber la veille. */
function localDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function weekStart(planStart: Date, number: number): Date {
  const start = new Date(planStart);
  start.setDate(start.getDate() + (number - 1) * 7);
  return start;
}

const CURRENT_PLAN_ID = "semi-trail-44k-2500d";
const LEGACY_PLAN_ID = "trail-44k-1500d";

const CURRENT_PLAN_START = startOfISOWeek(localDate(currentDocument.semaines[0]?.semaine_du ?? ""));

/**
 * Lundi de la semaine 1 de l'ancien plan. En dur, parce que ce plan était daté :
 * généré le 2026-07-31, un jour où sa semaine 1 était déjà commencée.
 */
const LEGACY_PLAN_START = startOfISOWeek(new Date(2026, 6, 27));

const CURRENT_PLAN: Plan = {
  id: CURRENT_PLAN_ID,
  name: currentDocument.meta.nom,
  objectives: currentDocument.meta.objectifs.map((objective) => ({
    name: objective.nom,
    date: localDate(objective.date),
    distanceKm: objective.distance_km,
    elevationGain: objective.denivele_positif_m,
    estimatedTime: objective.temps_estime_fourchette,
  })),
  start: CURRENT_PLAN_START,
  end: endOfISOWeek(weekStart(CURRENT_PLAN_START, currentDocument.semaines.length)),
  sessionsLabel: currentDocument.meta.libelle_seances,
  renfoCircuits: currentDocument.renfo.map((circuit) => ({
    id: circuit.id,
    name: circuit.nom,
    when: circuit.quand,
    format: circuit.format,
    exercises: circuit.exercices,
    progression: circuit.progression,
    note: circuit.note,
  })),
  weeks: currentDocument.semaines.map((week) => ({
    planId: CURRENT_PLAN_ID,
    number: week.numero,
    start: localDate(week.semaine_du),
    block: week.phase,
    weekType: null,
    sessions: week.seances,
    targetDuration: week.duree_min * 60,
    targetElevationGain: week.dplus,
    keyWorkouts: week.contenu,
    renfo: {
      circuitId: week.renfo.circuit,
      duration: week.renfo.duree,
      instruction: week.renfo.consigne,
    },
    optionalDuration: null,
    optionalElevationGain: null,
    totalDurationCeiling: null,
    note: week.note,
  })),
};

const LEGACY_PLAN: Plan = {
  id: LEGACY_PLAN_ID,
  name: legacyDocument.meta.objectif.nom,
  objectives: [
    {
      name: legacyDocument.meta.objectif.nom,
      // Ce plan ne datait pas sa course : il se comptait en semaines avant l'épreuve.
      date: null,
      distanceKm: legacyDocument.meta.objectif.distance_km,
      elevationGain: legacyDocument.meta.objectif.denivele_positif_m,
      estimatedTime: legacyDocument.meta.objectif.temps_estime_fourchette,
    },
  ],
  start: LEGACY_PLAN_START,
  end: endOfISOWeek(weekStart(LEGACY_PLAN_START, legacyDocument.semaines.length)),
  sessionsLabel: "sorties à pied",
  renfoCircuits: [],
  weeks: legacyDocument.semaines.map((week) => ({
    planId: LEGACY_PLAN_ID,
    number: week.numero,
    start: weekStart(LEGACY_PLAN_START, week.numero),
    block: week.bloc,
    weekType: week.type_semaine,
    sessions: week.sorties_pied,
    targetDuration: week.base.duree_min * 60,
    targetElevationGain: week.base.dplus,
    keyWorkouts: null,
    renfo: null,
    optionalDuration: week.avec_optionnelle.duree_min * 60,
    optionalElevationGain: week.avec_optionnelle.dplus,
    totalDurationCeiling: Math.round(week.heures_totales_max * 3600),
    note: week.note,
  })),
};

/** Du plus ancien au plus récent. */
export const PLANS: Plan[] = [LEGACY_PLAN, CURRENT_PLAN];

export function planById(id: string): Plan | null {
  return PLANS.find((plan) => plan.id === id) ?? null;
}

/**
 * Le plan à montrer d'emblée : celui qui couvre le jour donné, sinon le
 * prochain à commencer (entre deux plans, c'est celui qui arrive qui
 * intéresse), sinon le dernier terminé.
 */
export function activePlanAt(date: Date): Plan {
  const covering = PLANS.find((plan) => date >= plan.start && date <= plan.end);
  if (covering) return covering;
  const next = PLANS.find((plan) => plan.start > date);
  if (next) return next;
  return PLANS[PLANS.length - 1] ?? CURRENT_PLAN;
}

/**
 * Les plans dont la dernière semaine est passée, du plus ancien au plus
 * récent : ce que montre la page d'historique. Un plan à venir n'en fait pas
 * partie, et le plan en cours non plus — il se lit sur le tableau de bord,
 * avec ce qu'il reste à faire.
 */
export function finishedPlansAt(date: Date): Plan[] {
  return PLANS.filter((plan) => plan.end < date);
}

/** Numéro de semaine du plan donné couvrant cette date, ou `null` hors du plan. */
export function planWeekNumberAt(plan: Plan, date: Date): number | null {
  const offset = differenceInCalendarISOWeeks(date, plan.start);
  if (offset < 0 || offset >= plan.weeks.length) return null;
  return offset + 1;
}

/** Semaine couvrant cette date, tous plans confondus. Les plans ne se chevauchent pas. */
export function planWeekAt(date: Date): PlanWeek | null {
  for (const plan of PLANS) {
    const number = planWeekNumberAt(plan, date);
    if (number !== null) return plan.weeks[number - 1] ?? null;
  }
  return null;
}

export function planWeekByNumber(plan: Plan, number: number): PlanWeek | null {
  return plan.weeks[number - 1] ?? null;
}

/** Bornes calendaires (semaine ISO) d'une semaine de plan. */
export function planWeekRange(week: PlanWeek): { start: Date; end: Date } {
  return { start: week.start, end: endOfISOWeek(week.start) };
}

export function renfoCircuitFor(plan: Plan, week: PlanWeek): RenfoCircuit | null {
  if (week.renfo === null) return null;
  return plan.renfoCircuits.find((circuit) => circuit.id === week.renfo?.circuitId) ?? null;
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
 * contrat de la semaine. Le renfo n'y entre pas non plus : il n'est pas une
 * sortie, il se pointe à la main (voir `src/domain/renfo.ts`).
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
