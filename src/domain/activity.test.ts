import { describe, expect, it } from "vitest";
import { normalizeActivity } from "./activity";
import type { StravaActivityRaw } from "./schemas";

function raw(overrides: Partial<StravaActivityRaw> = {}): StravaActivityRaw {
  return {
    id: 1,
    name: "Sortie test",
    sport_type: "Run",
    start_date: "2026-07-01T06:00:00Z",
    start_date_local: "2026-07-01T08:00:00",
    distance: 10000,
    moving_time: 3000,
    elapsed_time: 3100,
    total_elevation_gain: 120,
    manual: false,
    ...overrides,
  };
}

describe("normalizeActivity", () => {
  it("convertit une distance nulle en absence, jamais en zéro", () => {
    expect(normalizeActivity(raw({ distance: 0 })).distance).toBeNull();
  });

  it("convertit une durée négative en absence", () => {
    expect(normalizeActivity(raw({ moving_time: -1 })).movingTime).toBeNull();
  });

  it("conserve un dénivelé de 0 m comme une vraie valeur, pas une absence", () => {
    expect(normalizeActivity(raw({ total_elevation_gain: 0 })).elevationGain).toBe(0);
  });

  it("classe le trail dans la même catégorie que la course, en conservant sportRaw", () => {
    const activity = normalizeActivity(raw({ sport_type: "TrailRun" }));
    expect(activity.sport).toBe("run");
    expect(activity.sportRaw).toBe("TrailRun");
  });

  it("classe un sport inconnu en 'other' sans rejeter l'activité", () => {
    const activity = normalizeActivity(raw({ sport_type: "IceSkate" }));
    expect(activity.sport).toBe("other");
    expect(activity.sportRaw).toBe("IceSkate");
  });

  it("répartit les sport_type du plan entre run, ride et hike", () => {
    const mapping: Array<[string, string]> = [
      ["Run", "run"],
      ["TrailRun", "run"],
      ["VirtualRun", "run"],
      ["Ride", "ride"],
      ["MountainBikeRide", "ride"],
      ["GravelRide", "ride"],
      ["EBikeRide", "ride"],
      ["VirtualRide", "ride"],
      ["Hike", "hike"],
    ];
    for (const [sportType, expected] of mapping) {
      expect(normalizeActivity(raw({ sport_type: sportType })).sport).toBe(expected);
    }
  });

  it("marque une activité manuelle sans indicateur optionnel", () => {
    const activity = normalizeActivity(raw({ manual: true, average_heartrate: undefined }));
    expect(activity.isManual).toBe(true);
    expect(activity.averageHeartrate).toBeNull();
  });
});
