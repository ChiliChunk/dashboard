import { useCallback, useEffect, useState } from "react";
import type { Activity, SyncCursor } from "../domain/types";
import { fetchActivitiesSince } from "./garmin";
import { clearDatabase, getAllActivities, getSyncCursor, putActivities, putSyncCursor } from "./store";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

interface SyncState {
  status: SyncStatus;
  activities: Activity[];
  syncedCount: number;
  lastSyncAt: number | null;
  errorMessage: string | null;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Orchestration de la récupération incrémentale contre le service Garmin
 * local (CA1.3, CA1.4). Un seul compte étant pris en charge (spec, section
 * 3), `SyncCursor.athleteId` ne sert plus à cloisonner le cache : il vaut
 * toujours 0.
 */
export function useSync() {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    activities: [],
    syncedCount: 0,
    lastSyncAt: null,
    errorMessage: null,
  });

  const runSync = useCallback(async (forceFullResync: boolean) => {
    if (isOffline()) {
      const cached = await getAllActivities();
      setState((previous) => ({ ...previous, status: "offline", activities: cached }));
      return;
    }

    setState((previous) => ({ ...previous, status: "syncing" }));

    if (forceFullResync) {
      await clearDatabase();
    }

    const existingCursor: SyncCursor | null = forceFullResync ? null : await getSyncCursor();
    const after = existingCursor?.lastActivityStart ?? 0;

    try {
      const activities = await fetchActivitiesSince(after);
      await putActivities(activities);

      let latestStart = after;
      for (const activity of activities) {
        const startEpoch = Math.floor(activity.startedAt.getTime() / 1000);
        if (startEpoch > latestStart) latestStart = startEpoch;
      }

      const cursor: SyncCursor = {
        athleteId: 0,
        lastActivityStart: latestStart,
        lastSyncAt: Date.now(),
        complete: true,
      };
      await putSyncCursor(cursor);

      const allCached = await getAllActivities();
      setState((previous) => ({
        ...previous,
        status: "synced",
        activities: allCached,
        syncedCount: activities.length,
        lastSyncAt: cursor.lastSyncAt,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Erreur de synchronisation inconnue.",
      }));
    }
  }, []);

  useEffect(() => {
    getAllActivities().then((cached) => {
      setState((previous) => ({ ...previous, activities: cached }));
    });
    void runSync(false);
  }, [runSync]);

  const resyncAll = useCallback(() => runSync(true), [runSync]);

  return { ...state, resyncAll };
}
