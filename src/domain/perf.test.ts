import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { clearDatabase, getAllActivities, putActivities } from "../data/store";
import { summarize, summarizeBySport } from "./aggregate";
import { sortActivities } from "./filter";
import { isWithinPeriod, resolvePeriod } from "./period";
import type { Activity } from "./types";

function syntheticActivities(count: number): Activity[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Sortie synthétique ${index}`,
    sport: index % 3 === 0 ? "run" : index % 3 === 1 ? "ride" : "hike",
    sportRaw: "Run",
    startedAt: new Date(2024, 0, 1 + (index % 700)),
    startedAtLocal: new Date(2024, 0, 1 + (index % 700)),
    distance: 1000 + (index % 50) * 200,
    duration: 600 + (index % 50) * 60,
    elapsedTime: 650 + (index % 50) * 60,
    elevationGain: (index % 20) * 10,
    averageHeartrate: null,
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
  }));
}

/**
 * Mesure ce que la logique de domaine contrôle réellement pour ENF4/ENF5 :
 * lecture du cache IndexedDB, agrégation, filtrage et tri sur 5 000 activités.
 * Le temps de peinture du navigateur et la latence réseau ne sont pas
 * mesurables ici sans outillage de bout en bout (voir plan, section 7) — cette
 * part relève de la vérification manuelle (T073/T074), pas de ce test.
 */
describe("performance sur un historique de 5000 activités", () => {
  it("lecture du cache + agrégation de la synthèse reste sous 2 s (ENF4)", async () => {
    await clearDatabase();
    const activities = syntheticActivities(5000);
    await putActivities(activities);

    const start = performance.now();
    const cached = await getAllActivities();
    const period = resolvePeriod("current-year", new Date(2024, 6, 1));
    const current = cached.filter((activity) => isWithinPeriod(activity.startedAtLocal, period));
    // Les deux passes d'agrégation que fait réellement la synthèse : le total
    // toutes activités, puis le sous-ensemble à pied, seul à compter pour le plan.
    summarize(current);
    summarize(current.filter((activity) => activity.sport === "run"));
    summarizeBySport(current);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it("borner une période puis trier reste sous 300 ms (ENF5)", () => {
    const activities = syntheticActivities(5000);
    const period = resolvePeriod("current-year", new Date(2024, 6, 1));

    const start = performance.now();
    const scoped = activities.filter((activity) => isWithinPeriod(activity.startedAtLocal, period));
    sortActivities(scoped, "date", "desc");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(300);
  });
});
