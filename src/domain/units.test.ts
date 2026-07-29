import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, formatElevation, formatPace } from "./units";

describe("formatage des unités", () => {
  it("affiche la distance en kilomètres avec une décimale", () => {
    expect(formatDistance(10500)).toBe("10.5 km");
  });

  it("n'affiche rien pour une distance absente", () => {
    expect(formatDistance(null)).toBeNull();
  });

  it("affiche la durée en heures et minutes au-delà d'une heure", () => {
    expect(formatDuration(5400)).toBe("1h30");
  });

  it("affiche la durée en minutes en-dessous d'une heure", () => {
    expect(formatDuration(1800)).toBe("30 min");
  });

  it("affiche un dénivelé de 0 m comme une vraie valeur", () => {
    expect(formatElevation(0)).toBe("0 m");
  });

  it("exprime l'allure en min/km pour la course à pied", () => {
    expect(formatPace("run", 10000, 3000)).toBe("5:00 min/km");
  });

  it("exprime l'allure en min/km pour la randonnée", () => {
    expect(formatPace("hike", 5000, 3600)).toBe("12:00 min/km");
  });

  it("exprime la vitesse en km/h pour le vélo", () => {
    expect(formatPace("ride", 30000, 3600)).toBe("30.0 km/h");
  });

  it("n'affiche rien quand une grandeur source est absente", () => {
    expect(formatPace("run", null, 3000)).toBeNull();
  });
});
