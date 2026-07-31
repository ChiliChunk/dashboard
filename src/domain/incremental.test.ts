import { describe, expect, it } from "vitest";
import {
  activityStartEpoch,
  latestStartEpoch,
  mergeActivities,
  selectFreshActivities,
} from "./incremental";
import type { Activity } from "./types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie",
    sport: "run",
    sportRaw: "running",
    startedAt: new Date("2026-07-28T17:14:32Z"),
    startedAtLocal: new Date("2026-07-28T19:14:32"),
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

/** Une page telle que le service la renvoie : de la plus récente à la plus ancienne. */
function page(...startsGmt: string[]): Activity[] {
  return startsGmt.map((iso, index) => activity({ id: index + 1, startedAt: new Date(iso) }));
}

describe("activityStartEpoch", () => {
  it("se base sur l'instant GMT, pas sur l'heure locale", () => {
    const gmtEpoch = Math.floor(Date.parse("2026-07-28T17:14:32Z") / 1000);
    expect(activityStartEpoch(activity())).toBe(gmtEpoch);
  });
});

describe("selectFreshActivities", () => {
  it("ne retient que les activités postérieures au curseur", () => {
    const activities = page(
      "2026-07-28T17:00:00Z",
      "2026-07-27T17:00:00Z",
      "2026-07-26T17:00:00Z",
    );
    const cursor = Math.floor(Date.parse("2026-07-26T17:00:00Z") / 1000);

    const { fresh } = selectFreshActivities(activities, cursor);
    expect(fresh.map((a) => a.id)).toEqual([1, 2]);
  });

  it("exclut une activité située exactement sur le curseur, sans la re-signaler", () => {
    const activities = page("2026-07-28T17:14:32Z");
    const cursor = Math.floor(Date.parse("2026-07-28T17:14:32Z") / 1000);

    const { fresh, reachedKnown } = selectFreshActivities(activities, cursor);
    expect(fresh).toHaveLength(0);
    expect(reachedKnown).toBe(true);
  });

  it("signale qu'on a rejoint le connu dès qu'une activité de la page est déjà stockée", () => {
    const activities = page("2026-07-28T17:00:00Z", "2026-07-20T17:00:00Z");
    const cursor = Math.floor(Date.parse("2026-07-24T00:00:00Z") / 1000);

    const { fresh, reachedKnown } = selectFreshActivities(activities, cursor);
    expect(fresh.map((a) => a.id)).toEqual([1]);
    expect(reachedKnown).toBe(true);
  });

  it("ne signale rien de connu quand toute la page est nouvelle (resynchronisation complète)", () => {
    const activities = page("2026-07-28T17:00:00Z", "2026-07-20T17:00:00Z");

    const { fresh, reachedKnown } = selectFreshActivities(activities, 0);
    expect(fresh).toHaveLength(2);
    expect(reachedKnown).toBe(false);
  });

  it("traite une page vide comme la fin de l'historique, sans rien de connu", () => {
    expect(selectFreshActivities([], 0)).toEqual({ fresh: [], reachedKnown: false });
  });
});

describe("mergeActivities", () => {
  it("ajoute les nouvelles activités à celles déjà connues", () => {
    const existing = [activity({ id: 1 })];
    const incoming = [activity({ id: 2 })];
    expect(mergeActivities(existing, incoming).map((a) => a.id)).toEqual([1, 2]);
  });

  it("ne compte pas deux fois une activité renvoyée à nouveau", () => {
    const existing = [activity({ id: 1, name: "Version stockée" })];
    const incoming = [activity({ id: 1, name: "Version reçue" })];

    const merged = mergeActivities(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.name).toBe("Version reçue");
  });

  it("ne modifie pas les tableaux fournis", () => {
    const existing = [activity({ id: 1 })];
    mergeActivities(existing, [activity({ id: 2 })]);
    expect(existing).toHaveLength(1);
  });
});

describe("latestStartEpoch", () => {
  it("retient le départ le plus récent, quel que soit l'ordre de la page", () => {
    const activities = page("2026-07-20T17:00:00Z", "2026-07-28T17:00:00Z");
    const expected = Math.floor(Date.parse("2026-07-28T17:00:00Z") / 1000);
    expect(latestStartEpoch(activities, 0)).toBe(expected);
  });

  it("conserve le curseur existant quand rien de plus récent n'arrive", () => {
    const cursor = Math.floor(Date.parse("2027-01-01T00:00:00Z") / 1000);
    expect(latestStartEpoch(page("2026-07-28T17:00:00Z"), cursor)).toBe(cursor);
  });

  it("laisse le curseur inchangé sur une liste vide", () => {
    expect(latestStartEpoch([], 42)).toBe(42);
  });
});
