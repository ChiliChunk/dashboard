import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";
import { buildTimeline } from "./timeline";
import type { Activity } from "./types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie",
    sport: "run",
    sportRaw: "Run",
    startedAt: new Date("2026-01-05T06:00:00Z"),
    startedAtLocal: new Date("2026-01-05T08:00:00"),
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

describe("buildTimeline", () => {
  it("crée une case pour chaque semaine, même sans activité — série contiguë (CA5.4)", () => {
    const period = resolvePeriod("current-year", new Date("2026-01-20T12:00:00Z"));
    const timeline = buildTimeline([activity()], period, "week", "distance");

    const emptyWeeks = timeline.filter((bucket) => bucket.value === 0);
    expect(emptyWeeks.length).toBeGreaterThan(0);

    for (let i = 1; i < timeline.length; i += 1) {
      const gapDays = (timeline[i]!.start.getTime() - timeline[i - 1]!.end.getTime()) / 86_400_000;
      expect(gapDays).toBeLessThan(2);
    }
  });

  it("agrège la grandeur demandée (CA5.2 exercé via le paramètre metric)", () => {
    const period = resolvePeriod("current-week", new Date("2026-01-05T12:00:00Z"));
    const timeline = buildTimeline([activity({ elevationGain: 250 })], period, "week", "elevation");
    expect(timeline[0]!.value).toBe(250);
  });

  it("une liste déjà filtrée à vide produit des cases à zéro, jamais des cases absentes", () => {
    const period = resolvePeriod("current-week", new Date("2026-01-05T12:00:00Z"));
    const timeline = buildTimeline([], period, "week", "distance");
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.value).toBe(0);
  });

  it("répartit la valeur d'une case par sport", () => {
    const period = resolvePeriod("current-week", new Date("2026-01-05T12:00:00Z"));
    const timeline = buildTimeline(
      [activity({ sport: "run", distance: 5000 }), activity({ id: 2, sport: "ride", distance: 15000 })],
      period,
      "week",
      "distance",
    );
    expect(timeline[0]!.bySport.run).toBe(5000);
    expect(timeline[0]!.bySport.ride).toBe(15000);
    expect(timeline[0]!.value).toBe(20000);
  });
});
