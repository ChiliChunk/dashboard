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
