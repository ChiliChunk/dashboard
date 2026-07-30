import { getISODay } from "date-fns";
import { describe, expect, it } from "vitest";
import { isWithinPeriod, lastWeeksBuckets, resolvePeriod } from "./period";

const WEDNESDAY = new Date("2026-07-29T10:00:00Z");

describe("resolvePeriod", () => {
  it("la semaine en cours commence un lundi et finit un dimanche", () => {
    const period = resolvePeriod("current-week", WEDNESDAY);
    expect(getISODay(period.start!)).toBe(1);
    expect(getISODay(period.end)).toBe(7);
  });

  it("place la date de référence dans sa propre semaine en cours", () => {
    const period = resolvePeriod("current-week", WEDNESDAY);
    expect(isWithinPeriod(WEDNESDAY, period)).toBe(true);
  });

  it("porte un libellé en toutes lettres avec ses bornes (CA2.9)", () => {
    const period = resolvePeriod("current-week", WEDNESDAY);
    expect(period.label.length).toBeGreaterThan(0);
    expect(period.label).toMatch(/\d/);
  });

  it("l'historique complet n'a pas de borne de début (CA2.4)", () => {
    expect(resolvePeriod("all-time", WEDNESDAY).start).toBeNull();
  });

  it("la période précédente de l'année en cours est l'année précédente exacte", () => {
    const period = resolvePeriod("current-year", WEDNESDAY);
    expect(period.previousStart?.getFullYear()).toBe(2025);
  });

  it("l'historique complet n'a pas de période précédente comparable", () => {
    const period = resolvePeriod("all-time", WEDNESDAY);
    expect(period.previousStart).toBeNull();
  });
});

describe("lastWeeksBuckets", () => {
  // WEDNESDAY = mercredi 29 juillet 2026 ; sa semaine ISO démarre le 27 (exclue : en cours).
  it("rend autant de semaines révolues que demandé, de la plus récente à la plus ancienne", () => {
    const buckets = lastWeeksBuckets(4, WEDNESDAY);
    expect(buckets).toHaveLength(4);
    expect(buckets.map((b) => b.start.getDate())).toEqual([20, 13, 6, 29]);
  });

  it("exclut la semaine en cours, incomplète", () => {
    const buckets = lastWeeksBuckets(4, WEDNESDAY);
    expect(buckets.some((b) => b.start.getDate() === 27 && b.start.getMonth() === 6)).toBe(false);
  });

  it("borne chaque semaine du lundi au dimanche", () => {
    for (const bucket of lastWeeksBuckets(4, WEDNESDAY)) {
      expect(getISODay(bucket.start)).toBe(1);
      expect(getISODay(bucket.end)).toBe(7);
    }
  });

  it("ne laisse ni trou ni recouvrement entre semaines consécutives (ordre décroissant)", () => {
    const buckets = lastWeeksBuckets(4, WEDNESDAY);
    for (let index = 1; index < buckets.length; index += 1) {
      const gapMs = buckets[index - 1]!.start.getTime() - buckets[index]!.end.getTime();
      expect(gapMs).toBeGreaterThan(0);
      expect(gapMs).toBeLessThan(1000);
    }
  });

  it("porte un libellé daté propre à chaque semaine, la plus récente en tête", () => {
    const labels = lastWeeksBuckets(4, WEDNESDAY).map((b) => b.label);
    expect(new Set(labels).size).toBe(4);
    expect(labels[0]).toContain("20");
  });
});
