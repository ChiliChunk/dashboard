import { describe, expect, it } from "vitest";
import { parseGarminActivity } from "./schemas";

function validGarminActivity(overrides: Record<string, unknown> = {}) {
  return {
    activityId: 1,
    activityName: "Sortie test",
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

describe("parseGarminActivity", () => {
  it("accepte une forme brute valide", () => {
    expect(() => parseGarminActivity(validGarminActivity())).not.toThrow();
  });

  it("accepte l'absence des champs optionnels (dénivelé, fréquence cardiaque)", () => {
    const withoutOptional = {
      activityId: 1,
      activityName: "Sortie test",
      activityType: { typeKey: "running" },
      startTimeGMT: "2026-07-01 06:00:00",
      startTimeLocal: "2026-07-01 08:00:00",
      distance: 10000,
      movingDuration: 3000,
      elapsedDuration: 3100,
    };
    const parsed = parseGarminActivity(withoutOptional);
    expect(parsed.elevationGain).toBeUndefined();
    expect(parsed.averageHR).toBeUndefined();
  });

  it("rejette une forme incomplète (champ obligatoire manquant)", () => {
    const incomplete = {
      activityId: 1,
      activityName: "Sortie test",
      activityType: { typeKey: "running" },
      startTimeGMT: "2026-07-01 06:00:00",
      startTimeLocal: "2026-07-01 08:00:00",
      movingDuration: 3000,
    };
    expect(() => parseGarminActivity(incomplete)).toThrow();
  });

  it("rejette une forme invalide (type incorrect)", () => {
    expect(() => parseGarminActivity(validGarminActivity({ distance: "10 km" }))).toThrow();
  });
});
