import { describe, expect, it } from "vitest";
import { applyFilters, EMPTY_FILTERS, sortActivities } from "./filter";
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
    movingTime: 3000,
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
      movingTime: 600 + (index % 50) * 60,
    }),
  );
}

describe("applyFilters", () => {
  it("filtre par sport (CA3.2)", () => {
    const activities = [activity({ sport: "run" }), activity({ id: 2, sport: "ride" })];
    const result = applyFilters(activities, { ...EMPTY_FILTERS, sports: ["run"] });
    expect(result.map((a) => a.id)).toEqual([1]);
  });

  it("filtre par intervalle de dates, bornes incluses (CA3.2)", () => {
    const activities = [
      activity({ id: 1, startedAtLocal: new Date("2026-01-05T08:00:00") }),
      activity({ id: 2, startedAtLocal: new Date("2026-01-10T08:00:00") }),
      activity({ id: 3, startedAtLocal: new Date("2026-01-15T08:00:00") }),
    ];
    const result = applyFilters(activities, {
      ...EMPTY_FILTERS,
      from: new Date("2026-01-05T00:00:00"),
      to: new Date("2026-01-10T23:59:59"),
    });
    expect(result.map((a) => a.id)).toEqual([1, 2]);
  });

  it("combine sport et dates", () => {
    const activities = [
      activity({ id: 1, sport: "run", startedAtLocal: new Date("2026-01-05T08:00:00") }),
      activity({ id: 2, sport: "ride", startedAtLocal: new Date("2026-01-05T08:00:00") }),
    ];
    const result = applyFilters(activities, {
      sports: ["run"],
      from: new Date("2026-01-01T00:00:00"),
      to: new Date("2026-01-31T23:59:59"),
    });
    expect(result.map((a) => a.id)).toEqual([1]);
  });

  it("renvoie une liste vide quand rien ne correspond (CA3.7)", () => {
    const activities = [activity({ sport: "run" })];
    expect(applyFilters(activities, { ...EMPTY_FILTERS, sports: ["ride"] })).toHaveLength(0);
  });
});

describe("sortActivities (CA3.3)", () => {
  it("trie par distance dans les deux sens", () => {
    const activities = [activity({ id: 1, distance: 5000 }), activity({ id: 2, distance: 10000 })];
    expect(sortActivities(activities, "distance", "asc").map((a) => a.id)).toEqual([1, 2]);
    expect(sortActivities(activities, "distance", "desc").map((a) => a.id)).toEqual([2, 1]);
  });

  it("trie par durée", () => {
    const activities = [
      activity({ id: 1, movingTime: 1000 }),
      activity({ id: 2, movingTime: 2000 }),
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
  it("filtre et trie en moins de 300 ms", () => {
    const activities = syntheticActivities(5000);
    const start = performance.now();
    const filtered = applyFilters(activities, { sports: ["run"], from: null, to: null });
    sortActivities(filtered, "distance", "desc");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });
});
