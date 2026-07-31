import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDatabase,
  getAllActivities,
  getSyncCursor,
  putActivities,
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
});
