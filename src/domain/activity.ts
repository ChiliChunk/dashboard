import type { GarminActivityRaw, StravaActivityRaw } from "./schemas";
import type { Activity, SportKind } from "./types";

const SPORT_MAP: Record<string, SportKind> = {
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  Ride: "ride",
  MountainBikeRide: "ride",
  GravelRide: "ride",
  EBikeRide: "ride",
  VirtualRide: "ride",
  Hike: "hike",
};

function toSportKind(sportType: string): SportKind {
  return SPORT_MAP[sportType] ?? "other";
}

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

export function normalizeActivity(raw: StravaActivityRaw): Activity {
  return {
    id: raw.id,
    name: raw.name,
    sport: toSportKind(raw.sport_type),
    sportRaw: raw.sport_type,
    startedAt: new Date(raw.start_date),
    startedAtLocal: new Date(raw.start_date_local),
    distance: positiveOrNull(raw.distance),
    movingTime: positiveOrNull(raw.moving_time),
    elapsedTime: positiveOrNull(raw.elapsed_time),
    elevationGain: optionalOrNull(raw.total_elevation_gain),
    averageHeartrate: optionalOrNull(raw.average_heartrate),
    averageWatts: optionalOrNull(raw.average_watts),
    averageCadence: optionalOrNull(raw.average_cadence),
    polyline: raw.map?.summary_polyline || null,
    isManual: raw.manual,
  };
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
 * Contrairement à `normalizeActivity` (Strava), la cadence, la puissance, le
 * tracé GPS et le caractère manuel d'une activité Garmin ne sont pas encore
 * câblés : leurs champs sources exacts restent à confirmer contre une vraie
 * réponse (plan, section 8, risques). Une absence y est donc délibérée, pas
 * un oubli — CA2.3 l'exige : jamais de valeur inventée.
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
    movingTime: positiveOrNull(raw.movingDuration),
    elapsedTime: positiveOrNull(raw.elapsedDuration),
    elevationGain: optionalOrNull(raw.elevationGain),
    averageHeartrate: optionalOrNull(raw.averageHR),
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
  };
}
