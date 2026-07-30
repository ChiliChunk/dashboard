import * as v from "valibot";

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
