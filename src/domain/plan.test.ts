import { differenceInCalendarDays } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  activePlanAt,
  finishedPlansAt,
  HIKE_DURATION_SHARE,
  PLANS,
  planById,
  planProgress,
  planWeekAt,
  planWeekByNumber,
  planWeekNumberAt,
  planWeekRange,
  renfoCircuitFor,
  type Plan,
  type PlanWeek,
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

function plan(id: string): Plan {
  const found = planById(id);
  if (found === null) throw new Error(`Plan absent : ${id}`);
  return found;
}

function week(planId: string, number: number): PlanWeek {
  const found = planWeekByNumber(plan(planId), number);
  if (found === null) throw new Error(`Semaine absente : ${planId} S${number}`);
  return found;
}

const CURRENT = "semi-trail-44k-2500d";
const LEGACY = "trail-44k-1500d";

describe("PLANS", () => {
  it("garde l'ancien plan à côté du courant, du plus ancien au plus récent", () => {
    expect(PLANS.map((entry) => entry.id)).toEqual([LEGACY, CURRENT]);
  });

  it("ne laisse aucun chevauchement entre deux plans", () => {
    for (let index = 1; index < PLANS.length; index += 1) {
      const previous = PLANS[index - 1];
      const next = PLANS[index];
      expect(previous && next && previous.end < next.start).toBe(true);
    }
  });

  it("aligne chaque semaine de chaque plan sur un lundi, sans trou", () => {
    for (const entry of PLANS) {
      for (const [index, item] of entry.weeks.entries()) {
        expect(item.start.getDay()).toBe(1);
        expect(item.number).toBe(index + 1);
        if (index > 0) {
          const previous = entry.weeks[index - 1];
          // En jours de calendrier, et non en millisecondes : la semaine du
          // passage à l'heure d'été ne compte que 167 heures.
          expect(previous && differenceInCalendarDays(item.start, previous.start)).toBe(7);
        }
      }
    }
  });
});

describe("plan courant (semi + trail 44 km)", () => {
  it("expose les 22 semaines du document, de fin novembre 2026 à fin avril 2027", () => {
    expect(plan(CURRENT).weeks).toHaveLength(22);
    expect(week(CURRENT, 1).start).toEqual(new Date(2026, 10, 30));
    expect(week(CURRENT, 22).start).toEqual(new Date(2027, 3, 26));
  });

  it("retrouve les totaux annoncés par le document : 98 h et 17 850 D+", () => {
    const weeks = plan(CURRENT).weeks;
    expect(weeks.reduce((sum, item) => sum + item.targetDuration, 0)).toBe(98 * 3600);
    expect(weeks.reduce((sum, item) => sum + item.targetElevationGain, 0)).toBe(17850);
  });

  it("convertit les cibles de la première semaine en secondes et en mètres", () => {
    expect(week(CURRENT, 1).targetDuration).toBe(225 * 60);
    expect(week(CURRENT, 1).targetElevationGain).toBe(300);
    expect(week(CURRENT, 1).sessions).toBe(3);
  });

  it("date les deux objectifs : le semi et le trail, tous deux un dimanche", () => {
    const objectives = plan(CURRENT).objectives;
    expect(objectives.map((objective) => objective.name)).toEqual([
      "Semi-marathon",
      "Trail 44 km / 2500 D+",
    ]);
    expect(objectives[0]?.date).toEqual(new Date(2027, 1, 7));
    expect(objectives[1]?.date).toEqual(new Date(2027, 3, 25));
    for (const objective of objectives) {
      expect(objective.date?.getDay()).toBe(0);
    }
  });

  it("place chaque course dans la semaine du plan qui la contient", () => {
    expect(planWeekAt(new Date(2027, 1, 7))?.number).toBe(10);
    expect(planWeekAt(new Date(2027, 3, 25))?.number).toBe(21);
  });

  it("ne prescrit aucun plafond ni sortie optionnelle, contrairement à l'ancien", () => {
    expect(week(CURRENT, 1).totalDurationCeiling).toBeNull();
    expect(week(CURRENT, 1).optionalDuration).toBeNull();
    expect(week(CURRENT, 1).optionalElevationGain).toBeNull();
  });

  it("rattache le renfo de chaque semaine à un circuit existant", () => {
    const entry = plan(CURRENT);
    expect(entry.renfoCircuits.map((circuit) => circuit.id)).toEqual(["A", "B", "C", "leger"]);
    for (const item of entry.weeks) {
      expect(item.renfo).not.toBeNull();
      expect(renfoCircuitFor(entry, item)?.id).toBe(item.renfo?.circuitId);
    }
  });

  it("suit le renfo annoncé par le document : A en reprise, B sur le bloc semi, léger les semaines de course", () => {
    expect(week(CURRENT, 1).renfo?.circuitId).toBe("A");
    expect(week(CURRENT, 7).renfo?.circuitId).toBe("B");
    expect(week(CURRENT, 10).renfo?.circuitId).toBe("leger");
    expect(week(CURRENT, 18).renfo?.circuitId).toBe("C");
  });

  it("donne au circuit trail sa progression lestée, aux autres aucune", () => {
    const circuits = plan(CURRENT).renfoCircuits;
    expect(circuits.find((circuit) => circuit.id === "C")?.progression).toContain("sac lesté");
    expect(circuits.find((circuit) => circuit.id === "A")?.progression).toBeNull();
    expect(circuits.find((circuit) => circuit.id === "C")?.exercises).toHaveLength(6);
  });
});

describe("ancien plan (trail 44 km / 1500 D+)", () => {
  it("garde ses 12 semaines et ses cibles d'alors", () => {
    expect(plan(LEGACY).weeks).toHaveLength(12);
    expect(week(LEGACY, 1).start).toEqual(new Date(2026, 6, 27));
    expect(week(LEGACY, 1).targetDuration).toBe(255 * 60);
    expect(week(LEGACY, 1).targetElevationGain).toBe(700);
    expect(week(LEGACY, 1).totalDurationCeiling).toBe(Math.round(6.75 * 3600));
  });

  it("garde la sortie optionnelle comme bonus, distincte de la cible", () => {
    expect(week(LEGACY, 1).optionalDuration).toBe(300 * 60);
    expect(week(LEGACY, 1).optionalElevationGain).toBe(900);
  });

  it("ne prescrit pas de renfo", () => {
    expect(plan(LEGACY).renfoCircuits).toEqual([]);
    expect(week(LEGACY, 1).renfo).toBeNull();
    expect(renfoCircuitFor(plan(LEGACY), week(LEGACY, 1))).toBeNull();
  });
});

describe("activePlanAt", () => {
  it("rend le plan qui couvre le jour donné", () => {
    expect(activePlanAt(new Date(2026, 7, 10)).id).toBe(LEGACY);
    expect(activePlanAt(new Date(2027, 0, 15)).id).toBe(CURRENT);
  });

  it("entre deux plans, rend celui qui arrive", () => {
    expect(activePlanAt(new Date(2026, 10, 27)).id).toBe(CURRENT);
  });

  it("avant le premier plan, rend le premier ; après le dernier, le dernier", () => {
    expect(activePlanAt(new Date(2026, 0, 1)).id).toBe(LEGACY);
    expect(activePlanAt(new Date(2028, 0, 1)).id).toBe(CURRENT);
  });
});

describe("finishedPlansAt", () => {
  it("ne retient que les plans dont la dernière semaine est passée", () => {
    expect(finishedPlansAt(new Date(2026, 10, 27)).map((entry) => entry.id)).toEqual([LEGACY]);
  });

  it("laisse dehors le plan en cours et celui qui n'a pas commencé", () => {
    expect(finishedPlansAt(new Date(2026, 7, 10))).toEqual([]);
    expect(finishedPlansAt(new Date(2027, 0, 15)).map((entry) => entry.id)).toEqual([LEGACY]);
  });

  it("retient les deux plans une fois le second terminé", () => {
    expect(finishedPlansAt(new Date(2027, 5, 1)).map((entry) => entry.id)).toEqual([
      LEGACY,
      CURRENT,
    ]);
  });
});

describe("planWeekNumberAt", () => {
  it("place le lundi de départ en semaine 1", () => {
    expect(planWeekNumberAt(plan(CURRENT), plan(CURRENT).start)).toBe(1);
  });

  it("place n'importe quel jour de la semaine ISO dans la même semaine de plan", () => {
    expect(planWeekNumberAt(plan(CURRENT), new Date(2026, 11, 2))).toBe(1);
    expect(planWeekNumberAt(plan(CURRENT), new Date(2026, 11, 6, 23, 59))).toBe(1);
    expect(planWeekNumberAt(plan(CURRENT), new Date(2026, 11, 7))).toBe(2);
  });

  it("rend null avant le début et après la dernière semaine", () => {
    expect(planWeekNumberAt(plan(CURRENT), new Date(2026, 10, 29))).toBeNull();
    // La semaine 22 court jusqu'au dimanche 2 mai : le lundi suivant est dehors.
    expect(planWeekNumberAt(plan(CURRENT), new Date(2027, 4, 3))).toBeNull();
  });
});

describe("planWeekAt", () => {
  it("cherche dans tous les plans, l'ancien compris", () => {
    expect(planWeekAt(new Date(2026, 7, 10))?.planId).toBe(LEGACY);
    expect(planWeekAt(new Date(2027, 0, 15))?.planId).toBe(CURRENT);
  });

  it("rend null dans le creux entre deux plans", () => {
    expect(planWeekAt(new Date(2026, 10, 27))).toBeNull();
  });
});

describe("planWeekRange", () => {
  it("borne chaque semaine du lundi au dimanche", () => {
    const range = planWeekRange(week(CURRENT, 1));
    expect(range.start).toEqual(new Date(2026, 10, 30));
    expect(range.end.getDay()).toBe(0);
    expect(range.end.getDate()).toBe(6);
  });
});

describe("planProgress", () => {
  const target = week(LEGACY, 1);

  it("compte la course en entier, la rando pour tout son D+ et la moitié de son temps", () => {
    const progress = planProgress(target, [
      activity({ sport: "run", duration: 3600, elevationGain: 400 }),
      activity({ id: 2, sport: "hike", duration: 7200, elevationGain: 1200 }),
    ]);
    expect(progress.duration).toBe(3600 + 7200 * HIKE_DURATION_SHARE);
    expect(progress.elevationGain).toBe(1600);
  });

  it("laisse le vélo hors des deux compteurs", () => {
    const progress = planProgress(target, [
      activity({ sport: "run", duration: 3600, elevationGain: 400 }),
      activity({ id: 3, sport: "ride", duration: 5400, elevationGain: 800 }),
    ]);
    expect(progress.duration).toBe(3600);
    expect(progress.elevationGain).toBe(400);
  });

  it("marque « none » quand aucun des deux quotas n'est atteint", () => {
    expect(planProgress(target, [activity({ duration: 1800, elevationGain: 100 })]).status).toBe(
      "none",
    );
  });

  it("marque « one » quand un seul quota est atteint", () => {
    const progress = planProgress(target, [activity({ duration: 1800, elevationGain: 800 })]);
    expect(progress.status).toBe("one");
    expect(progress.elevationMet).toBe(true);
    expect(progress.durationMet).toBe(false);
  });

  it("marque « both » quand les deux quotas sont atteints", () => {
    expect(
      planProgress(target, [activity({ duration: 255 * 60, elevationGain: 700 })]).status,
    ).toBe("both");
  });

  it("traite une grandeur absente comme n'apportant rien", () => {
    const progress = planProgress(target, [activity({ duration: null, elevationGain: null })]);
    expect(progress.duration).toBe(0);
    expect(progress.elevationGain).toBe(0);
  });
});
