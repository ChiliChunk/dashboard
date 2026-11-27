import { describe, expect, it } from "vitest";
import { PLANS } from "./plan";
import { isRenfoDoneAt, renfoDoneCount, renfoWeekKey, toRenfoDoneSet } from "./renfo";

describe("renfoWeekKey", () => {
  it("ramène n'importe quel jour au lundi de sa semaine ISO", () => {
    expect(renfoWeekKey(new Date(2026, 10, 30))).toBe("2026-11-30");
    expect(renfoWeekKey(new Date(2026, 11, 6, 23, 59))).toBe("2026-11-30");
    expect(renfoWeekKey(new Date(2026, 11, 7))).toBe("2026-12-07");
  });

  it("ne dépend pas de l'heure de la journée", () => {
    expect(renfoWeekKey(new Date(2027, 0, 13, 0, 1))).toBe(
      renfoWeekKey(new Date(2027, 0, 13, 23, 59)),
    );
  });
});

describe("isRenfoDoneAt", () => {
  const done = toRenfoDoneSet([{ weekKey: "2026-11-30", doneAt: 1 }]);

  it("reconnaît la semaine pointée par n'importe lequel de ses jours", () => {
    expect(isRenfoDoneAt(done, new Date(2026, 11, 3))).toBe(true);
  });

  it("laisse les autres semaines à « pas fait »", () => {
    expect(isRenfoDoneAt(done, new Date(2026, 11, 8))).toBe(false);
    expect(isRenfoDoneAt(new Set<string>(), new Date(2026, 11, 3))).toBe(false);
  });
});

describe("renfoDoneCount", () => {
  it("ne compte que les semaines données, pas tout le journal", () => {
    const plan = PLANS[PLANS.length - 1];
    const weeks = plan?.weeks.slice(0, 3) ?? [];
    const done = toRenfoDoneSet([
      { weekKey: renfoWeekKey(weeks[0]?.start ?? new Date()), doneAt: 1 },
      { weekKey: renfoWeekKey(weeks[2]?.start ?? new Date()), doneAt: 2 },
      // Une semaine pointée hors de la tranche demandée : elle ne doit pas compter.
      { weekKey: "2025-01-06", doneAt: 3 },
    ]);
    expect(renfoDoneCount(done, weeks)).toBe(2);
  });

  it("rend zéro sur un journal vide", () => {
    expect(renfoDoneCount(new Set<string>(), PLANS[0]?.weeks ?? [])).toBe(0);
  });
});
