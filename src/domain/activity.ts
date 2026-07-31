import type { GarminActivityRaw } from "./schemas";
import type { Activity, SportKind } from "./types";

/** Une distance ou une durée ≤ 0 est une donnée aberrante, jamais une vraie valeur. */
function positiveOrNull(value: number | undefined): number | null {
  if (value === undefined || value <= 0) return null;
  return value;
}

/**
 * Contrairement à la distance et à la durée, 0 est une valeur réelle et fréquente
 * pour le dénivelé (parcours plat) : seule l'absence de la donnée devient `null`.
 */
function optionalOrNull(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

const GARMIN_SPORT_MAP: Record<string, SportKind> = {
  running: "run",
  trail_running: "run",
  track_running: "run",
  treadmill_running: "run",
  virtual_run: "run",
  cycling: "ride",
  road_biking: "ride",
  mountain_biking: "ride",
  gravel_cycling: "ride",
  virtual_ride: "ride",
  indoor_cycling: "ride",
  hiking: "hike",
};

function toGarminSportKind(typeKey: string): SportKind {
  return GARMIN_SPORT_MAP[typeKey] ?? "other";
}

/**
 * La cadence, la puissance, le tracé GPS et le caractère manuel d'une
 * activité Garmin ne sont pas encore câblés : leurs champs sources exacts
 * restent à confirmer contre une vraie réponse (plan, section 8, risques).
 * Une absence y est donc délibérée, pas un oubli — CA2.3 l'exige : jamais de
 * valeur inventée.
 */
export function normalizeGarminActivity(raw: GarminActivityRaw): Activity {
  return {
    id: raw.activityId,
    name: raw.activityName,
    sport: toGarminSportKind(raw.activityType.typeKey),
    sportRaw: raw.activityType.typeKey,
    startedAt: new Date(`${raw.startTimeGMT.replace(" ", "T")}Z`),
    startedAtLocal: new Date(raw.startTimeLocal.replace(" ", "T")),
    distance: positiveOrNull(raw.distance),
    duration: positiveOrNull(raw.duration),
    elapsedTime: positiveOrNull(raw.elapsedDuration),
    elevationGain: optionalOrNull(raw.elevationGain),
    averageHeartrate: optionalOrNull(raw.averageHR),
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
  };
}
