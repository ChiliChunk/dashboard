import { describe, expect, it } from "vitest";
import { summarize, summarizeBySport } from "./aggregate";
import type { Activity } from "./types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie",
    sport: "run",
    sportRaw: "Run",
    startedAt: new Date("2026-07-01T06:00:00Z"),
    startedAtLocal: new Date("2026-07-01T08:00:00"),
    distance: 10000,
    duration: 3000,
    elapsedTime: 3100,
    elevationGain: 100,
    averageHeartrate: null,
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
    ...overrides,
  };
}

describe("summarize", () => {
  it("calcule les quatre totaux (CA2.1)", () => {
    const summary = summarize([activity(), activity({ id: 2, distance: 5000 })]);
    expect(summary).toEqual({
      count: 2,
      totalDistance: 15000,
      totalDuration: 6000,
      totalElevationGain: 200,
    });
  });

  it("traite une grandeur absente comme n'apportant rien à la somme", () => {
    expect(summarize([activity({ distance: null })]).totalDistance).toBe(0);
  });

  it("renvoie des totaux nuls sur une liste vide", () => {
    expect(summarize([])).toEqual({
      count: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalElevationGain: 0,
    });
  });
});

describe("summarizeBySport", () => {
  it("répartit les activités par sport (CA2.3)", () => {
    const bySport = summarizeBySport([
      activity({ sport: "run" }),
      activity({ id: 2, sport: "ride", distance: 20000 }),
    ]);
    expect(bySport.run.count).toBe(1);
    expect(bySport.ride.count).toBe(1);
    expect(bySport.hike.count).toBe(0);
  });
});
