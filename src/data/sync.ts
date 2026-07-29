import { useCallback, useEffect, useRef, useState } from "react";
import type { Activity, SyncCursor } from "../domain/types";
import { QuotaExceededError, RequestQuota } from "./quota";
import { clearDatabase, getAllActivities, getSyncCursor, putActivities, putSyncCursor } from "./store";
import { fetchActivitiesSince } from "./strava";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "quota-exceeded" | "error";

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

/** Orchestration de la synchronisation incrémentale (CA6.2, CA6.4, CA6.5). */
export function useSync(accessToken: string | null, athleteId: number | null) {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    activities: [],
    syncedCount: 0,
    lastSyncAt: null,
    errorMessage: null,
  });
  const quotaRef = useRef(new RequestQuota());

  const runSync = useCallback(
    async (forceFullResync: boolean) => {
      if (!accessToken || athleteId === null) return;

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
        let syncedCount = 0;
        let latestStart = after;

        for await (const { activities, headers } of fetchActivitiesSince(accessToken, after)) {
          quotaRef.current.recordHeaders(
            headers.get("X-RateLimit-Usage"),
            headers.get("X-RateLimit-Limit"),
          );
          quotaRef.current.checkAndRecord();

          await putActivities(activities);
          syncedCount += activities.length;
          for (const activity of activities) {
            const startEpoch = Math.floor(activity.startedAt.getTime() / 1000);
            if (startEpoch > latestStart) latestStart = startEpoch;
          }

          const cached = await getAllActivities();
          setState((previous) => ({ ...previous, activities: cached, syncedCount }));
        }

        const cursor: SyncCursor = {
          athleteId,
          lastActivityStart: latestStart,
          lastSyncAt: Date.now(),
          complete: true,
        };
        await putSyncCursor(cursor);

        setState((previous) => ({ ...previous, status: "synced", lastSyncAt: cursor.lastSyncAt }));
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          setState((previous) => ({ ...previous, status: "quota-exceeded" }));
          return;
        }
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Erreur de synchronisation inconnue.",
        }));
      }
    },
    [accessToken, athleteId],
  );

  useEffect(() => {
    getAllActivities().then((cached) => {
      setState((previous) => ({ ...previous, activities: cached }));
    });
    void runSync(false);
  }, [runSync]);

  const resyncAll = useCallback(() => runSync(true), [runSync]);

  return { ...state, resyncAll };
}
