import { describe, expect, it } from "vitest";
import { normalizeGarminActivity } from "./activity";
import type { GarminActivityRaw } from "./schemas";

function garminRaw(overrides: Partial<GarminActivityRaw> = {}): GarminActivityRaw {
  return {
    activityId: 1,
    activityName: "Sortie Garmin test",
    activityType: { typeKey: "running" },
    startTimeGMT: "2026-07-01 06:00:00",
    startTimeLocal: "2026-07-01 08:00:00",
    distance: 10000,
    movingDuration: 3000,
    elapsedDuration: 3100,
    elevationGain: 120,
    averageHR: 145,
    ...overrides,
  };
}

describe("normalizeGarminActivity", () => {
  it("convertit une distance nulle en absence, jamais en zéro", () => {
    expect(normalizeGarminActivity(garminRaw({ distance: 0 })).distance).toBeNull();
  });

  it("distingue durée déplacée et durée écoulée", () => {
    const activity = normalizeGarminActivity(garminRaw({ movingDuration: 3000, elapsedDuration: 3200 }));
    expect(activity.movingTime).toBe(3000);
    expect(activity.elapsedTime).toBe(3200);
  });

  it("conserve un dénivelé de 0 m comme une vraie valeur, pas une absence", () => {
    expect(normalizeGarminActivity(garminRaw({ elevationGain: 0 })).elevationGain).toBe(0);
  });

  it("classe un type inconnu en 'other' sans rejeter l'activité", () => {
    const activity = normalizeGarminActivity(garminRaw({ activityType: { typeKey: "ice_skating" } }));
    expect(activity.sport).toBe("other");
    expect(activity.sportRaw).toBe("ice_skating");
  });

  it("répartit les types Garmin entre run, ride et hike", () => {
    const mapping: Array<[string, string]> = [
      ["running", "run"],
      ["trail_running", "run"],
      ["treadmill_running", "run"],
      ["cycling", "ride"],
      ["mountain_biking", "ride"],
      ["gravel_cycling", "ride"],
      ["hiking", "hike"],
    ];
    for (const [typeKey, expected] of mapping) {
      expect(normalizeGarminActivity(garminRaw({ activityType: { typeKey } })).sport).toBe(expected);
    }
  });

  it("laisse une mesure non câblée (cadence, puissance, tracé) explicitement absente", () => {
    const activity = normalizeGarminActivity(garminRaw());
    expect(activity.averageCadence).toBeNull();
    expect(activity.averageWatts).toBeNull();
    expect(activity.polyline).toBeNull();
  });

  it("laisse une mesure optionnelle absente à l'absence, jamais inventée", () => {
    const withoutOptional: GarminActivityRaw = {
      activityId: 1,
      activityName: "Sortie Garmin test",
      activityType: { typeKey: "running" },
      startTimeGMT: "2026-07-01 06:00:00",
      startTimeLocal: "2026-07-01 08:00:00",
      distance: 10000,
      movingDuration: 3000,
      elapsedDuration: 3100,
    };
    const activity = normalizeGarminActivity(withoutOptional);
    expect(activity.elevationGain).toBeNull();
    expect(activity.averageHeartrate).toBeNull();
  });
});
