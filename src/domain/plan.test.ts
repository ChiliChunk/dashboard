import { describe, expect, it } from "vitest";
import {
  PLAN_START,
  PLAN_WEEKS,
  planProgress,
  planWeekAt,
  planWeekNumberAt,
  planWeekRange,
} from "./plan";
import type { Activity } from "./types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie",
    sport: "run",
    sportRaw: "trail_running",
    startedAt: new Date("2026-07-28T06:00:00Z"),
    startedAtLocal: new Date("2026-07-28T08:00:00"),
    distance: 10000,
    duration: 3600,
    elevationGain: 300,
    elapsedTime: 3700,
    averageHeartrate: null,
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
    ...overrides,
  };
}

describe("PLAN_WEEKS", () => {
  it("expose les 12 semaines du document de référence", () => {
    expect(PLAN_WEEKS).toHaveLength(12);
    expect(PLAN_WEEKS.map((week) => week.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("convertit les cibles en secondes et en mètres", () => {
    const first = PLAN_WEEKS[0];
    expect(first?.targetDuration).toBe(255 * 60);
    expect(first?.targetElevationGain).toBe(700);
    expect(first?.totalDurationCeiling).toBe(Math.round(6.75 * 3600));
  });

  it("garde la sortie optionnelle comme bonus, distincte de la cible", () => {
    const first = PLAN_WEEKS[0];
    expect(first?.optionalDuration).toBe(300 * 60);
    expect(first?.optionalElevationGain).toBe(900);
  });
});

describe("planWeekNumberAt", () => {
  it("place le lundi de départ en semaine 1", () => {
    expect(planWeekNumberAt(PLAN_START)).toBe(1);
  });

  it("place n'importe quel jour de la semaine ISO dans la même semaine de plan", () => {
    expect(planWeekNumberAt(new Date(2026, 6, 31))).toBe(1);
    expect(planWeekNumberAt(new Date(2026, 7, 2, 23, 59))).toBe(1);
    expect(planWeekNumberAt(new Date(2026, 7, 3))).toBe(2);
  });

  it("rend null avant le début et après la douzième semaine", () => {
    expect(planWeekNumberAt(new Date(2026, 6, 26))).toBeNull();
    expect(planWeekNumberAt(new Date(2026, 9, 18))).toBe(12);
    expect(planWeekNumberAt(new Date(2026, 9, 19))).toBeNull();
  });
});

describe("planWeekRange", () => {
  it("aligne chaque semaine de plan sur sa semaine ISO", () => {
    expect(planWeekRange(1).start).toEqual(PLAN_START);
    expect(planWeekRange(12).start).toEqual(new Date(2026, 9, 12));
    expect(planWeekAt(planWeekRange(5).start)?.number).toBe(5);
  });
});

describe("planProgress", () => {
  const week = PLAN_WEEKS[0]!;

  it("ne compte que les sorties de course à pied", () => {
    const progress = planProgress(week, [
      activity({ sport: "run", duration: 3600, elevationGain: 400 }),
      activity({ id: 2, sport: "hike", duration: 7200, elevationGain: 1200 }),
      activity({ id: 3, sport: "ride", duration: 5400, elevationGain: 800 }),
    ]);
    expect(progress.duration).toBe(3600);
    expect(progress.elevationGain).toBe(400);
  });

  it("marque « none » quand aucun des deux quotas n'est atteint", () => {
    expect(planProgress(week, [activity({ duration: 1800, elevationGain: 100 })]).status).toBe(
      "none",
    );
  });

  it("marque « one » quand un seul quota est atteint", () => {
    const progress = planProgress(week, [activity({ duration: 1800, elevationGain: 800 })]);
    expect(progress.status).toBe("one");
    expect(progress.elevationMet).toBe(true);
    expect(progress.durationMet).toBe(false);
  });

  it("marque « both » quand les deux quotas sont atteints", () => {
    expect(planProgress(week, [activity({ duration: 255 * 60, elevationGain: 700 })]).status).toBe(
      "both",
    );
  });

  it("traite une grandeur absente comme n'apportant rien", () => {
    const progress = planProgress(week, [activity({ duration: null, elevationGain: null })]);
    expect(progress.duration).toBe(0);
    expect(progress.elevationGain).toBe(0);
  });
});
