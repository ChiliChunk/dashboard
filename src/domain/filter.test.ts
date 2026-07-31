import { describe, expect, it } from "vitest";
import { sortActivities } from "./filter";
import type { Activity } from "./types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie",
    sport: "run",
    sportRaw: "Run",
    startedAt: new Date("2026-01-01T06:00:00Z"),
    startedAtLocal: new Date("2026-01-01T08:00:00"),
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

function syntheticActivities(count: number): Activity[] {
  return Array.from({ length: count }, (_, index) =>
    activity({
      id: index,
      sport: index % 3 === 0 ? "run" : index % 3 === 1 ? "ride" : "hike",
      startedAtLocal: new Date(2026, 0, 1 + (index % 365)),
      distance: 1000 + (index % 50) * 200,
      duration: 600 + (index % 50) * 60,
    }),
  );
}

describe("sortActivities (CA3.3)", () => {
  it("trie par distance dans les deux sens", () => {
    const activities = [activity({ id: 1, distance: 5000 }), activity({ id: 2, distance: 10000 })];
    expect(sortActivities(activities, "distance", "asc").map((a) => a.id)).toEqual([1, 2]);
    expect(sortActivities(activities, "distance", "desc").map((a) => a.id)).toEqual([2, 1]);
  });

  it("trie par durée", () => {
    const activities = [
      activity({ id: 1, duration: 1000 }),
      activity({ id: 2, duration: 2000 }),
    ];
    expect(sortActivities(activities, "duration", "asc").map((a) => a.id)).toEqual([1, 2]);
  });

  it("trie par date dans les deux sens", () => {
    const activities = [
      activity({ id: 1, startedAtLocal: new Date("2026-01-01T08:00:00") }),
      activity({ id: 2, startedAtLocal: new Date("2026-01-02T08:00:00") }),
    ];
    expect(sortActivities(activities, "date", "desc").map((a) => a.id)).toEqual([2, 1]);
    expect(sortActivities(activities, "date", "asc").map((a) => a.id)).toEqual([1, 2]);
  });
});

describe("performance sur 5000 activités (ENF5)", () => {
  it("trie en moins de 300 ms", () => {
    const activities = syntheticActivities(5000);
    const start = performance.now();
    sortActivities(activities, "distance", "desc");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });
});
