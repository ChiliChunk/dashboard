import { getISODay } from "date-fns";
import { describe, expect, it } from "vitest";
import { isWithinPeriod, resolvePeriod } from "./period";

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
