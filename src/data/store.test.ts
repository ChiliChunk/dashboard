import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDatabase,
  deleteRenfoEntry,
  getAllActivities,
  getRenfoEntries,
  getSyncCursor,
  putActivities,
  putRenfoEntry,
  putSyncCursor,
} from "./store";
import type { Activity, SyncCursor } from "../domain/types";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    name: "Sortie test",
    sport: "run",
    sportRaw: "Run",
    startedAt: new Date("2026-07-01T06:00:00Z"),
    startedAtLocal: new Date("2026-07-01T08:00:00"),
    distance: 10000,
    duration: 3000,
    elapsedTime: 3100,
    elevationGain: 50,
    averageHeartrate: null,
    averageWatts: null,
    averageCadence: null,
    polyline: null,
    isManual: false,
    ...overrides,
  };
}

describe("persistance IndexedDB", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("écrit et relit des activités", async () => {
    await putActivities([activity(), activity({ id: 2 })]);
    const stored = await getAllActivities();
    expect(stored).toHaveLength(2);
  });

  it("lit un curseur de synchronisation après écriture", async () => {
    const cursor: SyncCursor = {
      athleteId: 42,
      lastActivityStart: 1000,
      lastSyncAt: 2000,
      complete: false,
    };
    await putSyncCursor(cursor);
    await expect(getSyncCursor()).resolves.toEqual(cursor);
  });

  it("ne renvoie aucun curseur avant la première écriture", async () => {
    await expect(getSyncCursor()).resolves.toBeNull();
  });

  it("efface entièrement la base (CA1.6)", async () => {
    await putActivities([activity()]);
    await clearDatabase();
    await expect(getAllActivities()).resolves.toHaveLength(0);
  });

  // Seule donnée de l'application qu'aucune synchronisation ne reconstruirait.
  it("préserve le journal de renfo en vidant les activités", async () => {
    await putActivities([activity()]);
    await putRenfoEntry({ weekKey: "2026-11-30", doneAt: 1 });
    await clearDatabase();
    await expect(getAllActivities()).resolves.toHaveLength(0);
    expect((await getRenfoEntries()).map((entry) => entry.weekKey)).toEqual(["2026-11-30"]);
  });
});

describe("journal de renfo", () => {
  beforeEach(async () => {
    await clearDatabase();
    // `clearDatabase` préserve délibérément le journal de renfo : ces tests le
    // vident donc eux-mêmes pour partir d'un état connu.
    for (const entry of await getRenfoEntries()) {
      await deleteRenfoEntry(entry.weekKey);
    }
  });

  it("ne contient rien avant le premier pointage", async () => {
    expect(await getRenfoEntries()).toEqual([]);
  });

  it("écrit et relit une semaine pointée", async () => {
    await putRenfoEntry({ weekKey: "2026-11-30", doneAt: 1764460800000 });
    expect(await getRenfoEntries()).toEqual([{ weekKey: "2026-11-30", doneAt: 1764460800000 }]);
  });

  it("ne garde qu'une entrée par semaine", async () => {
    await putRenfoEntry({ weekKey: "2026-11-30", doneAt: 1 });
    await putRenfoEntry({ weekKey: "2026-11-30", doneAt: 2 });
    const entries = await getRenfoEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.doneAt).toBe(2);
  });

  // Décocher supprime : l'absence d'entrée vaut « pas fait », rien n'est
  // stocké pour une semaine non faite.
  it("oublie une semaine dépointée", async () => {
    await putRenfoEntry({ weekKey: "2026-11-30", doneAt: 1 });
    await putRenfoEntry({ weekKey: "2026-12-07", doneAt: 2 });
    await deleteRenfoEntry("2026-11-30");
    expect((await getRenfoEntries()).map((entry) => entry.weekKey)).toEqual(["2026-12-07"]);
  });
});
