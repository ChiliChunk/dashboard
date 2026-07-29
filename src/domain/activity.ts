import type { StravaActivityRaw } from "./schemas";
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
