import * as v from "valibot";

export const StravaActivitySchema = v.object({
  id: v.number(),
  name: v.string(),
  sport_type: v.string(),
  start_date: v.string(),
  start_date_local: v.string(),
  distance: v.number(),
  moving_time: v.number(),
  elapsed_time: v.number(),
  total_elevation_gain: v.number(),
  manual: v.boolean(),
  average_heartrate: v.optional(v.number()),
  average_watts: v.optional(v.number()),
  average_cadence: v.optional(v.number()),
  map: v.optional(v.object({ summary_polyline: v.optional(v.string()) })),
});

export type StravaActivityRaw = v.InferOutput<typeof StravaActivitySchema>;

export function parseStravaActivity(data: unknown): StravaActivityRaw {
  return v.parse(StravaActivitySchema, data);
}

/**
 * Forme brute renvoyée par le service Garmin local (specs/002-source-garmin).
 * Champs confirmés contre une vraie réponse (T012) : identifiant, nom, type,
 * horodatages, distance, durée déplacée/écoulée, dénivelé, fréquence
 * cardiaque. Cadence, puissance et tracé GPS existent bien côté Garmin
 * (`averageRunningCadenceInStepsPerMinute`, `avgPower`, et un tracé complet
 * via un appel séparé de télémétrie qui renvoie des séries de mesures, pas
 * un résumé) mais ne sont pas encore câblés : le nom du champ de cadence
 * varie selon le sport (course/vélo), et le tracé demanderait un second appel
 * réseau par activité consultée — laissé pour une itération suivante.
 */
export const GarminActivitySchema = v.object({
  activityId: v.number(),
  activityName: v.string(),
  activityType: v.object({ typeKey: v.string() }),
  startTimeGMT: v.string(),
  startTimeLocal: v.string(),
  distance: v.number(),
  movingDuration: v.number(),
  elapsedDuration: v.number(),
  elevationGain: v.optional(v.number()),
  averageHR: v.optional(v.number()),
});

export type GarminActivityRaw = v.InferOutput<typeof GarminActivitySchema>;

export function parseGarminActivity(data: unknown): GarminActivityRaw {
  return v.parse(GarminActivitySchema, data);
}
