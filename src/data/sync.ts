import { useCallback, useEffect, useState } from "react";
import { latestStartEpoch, mergeActivities, selectFreshActivities } from "../domain/incremental";
import type { Activity, SyncCursor } from "../domain/types";
import { fetchActivityPage } from "./garmin";
import {
  clearDatabase,
  getAllActivities,
  getSyncCursor,
  putActivities,
  putSyncCursor,
} from "./store";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "cleared";

/**
 * Taille de page : assez grande pour qu'une visite ordinaire tienne en un
 * seul appel, assez petite pour que la progression d'un historique complet
 * avance visiblement.
 */
const PAGE_SIZE = 50;

interface SyncState {
  status: SyncStatus;
  /** Tout le contenu du stockage local, seule source d'affichage. */
  activities: Activity[];
  /** Nouvelles sorties rapatriées pendant la passe en cours ou la dernière. */
  newCount: number;
  lastSyncAt: number | null;
  errorMessage: string | null;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Synchronisation strictement incrémentale : le stockage local (IndexedDB)
 * fait foi et n'est jamais vidé ; seules les activités postérieures au
 * curseur sont demandées au service Garmin local (CA1.3, CA1.4). Un seul
 * compte étant pris en charge (spec, section 3), `SyncCursor.athleteId` ne
 * cloisonne rien : il vaut toujours 0.
 */
export function useSync() {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    activities: [],
    newCount: 0,
    lastSyncAt: null,
    errorMessage: null,
  });

  const runSync = useCallback(async () => {
    if (isOffline()) {
      const cached = await getAllActivities();
      setState((previous) => ({ ...previous, status: "offline", activities: cached }));
      return;
    }

    setState((previous) => ({ ...previous, status: "syncing", newCount: 0, errorMessage: null }));

    // Toujours incrémental, y compris quand l'utilisateur le déclenche à la
    // main : le stockage local est conservé et seules les activités plus
    // récentes que le curseur sont demandées. Curseur absent (premier
    // lancement) = 0, ce qui rapatrie l'historique entier une seule fois.
    const existingCursor: SyncCursor | null = await getSyncCursor();
    const after = existingCursor?.lastActivityStart ?? 0;

    try {
      let offset = 0;
      let newCount = 0;
      let latest = after;

      for (;;) {
        const pageActivities = await fetchActivityPage(offset, PAGE_SIZE);
        if (pageActivities.length === 0) break;

        const { fresh, reachedKnown } = selectFreshActivities(pageActivities, after);
        if (fresh.length > 0) {
          // Écrit page par page : une coupure en cours de route laisse les
          // activités déjà reçues en place plutôt que de tout perdre.
          await putActivities(fresh);
          newCount += fresh.length;
          latest = latestStartEpoch(fresh, latest);
          // Publié au fil de l'eau : le décompte affiché reste exact pendant
          // la passe, et le tableau de bord se remplit au lieu d'attendre.
          setState((previous) => ({
            ...previous,
            newCount,
            activities: mergeActivities(previous.activities, fresh),
          }));
        }

        // Une page déjà connue, ou plus courte que demandée, marque la fin.
        if (reachedKnown || pageActivities.length < PAGE_SIZE) break;
        offset += pageActivities.length;
      }

      // Curseur avancé seulement après une passe complète : un échec en cours
      // de pagination doit laisser la prochaine visite reprendre le travail.
      const cursor: SyncCursor = {
        athleteId: 0,
        lastActivityStart: latest,
        lastSyncAt: Date.now(),
        complete: true,
      };
      await putSyncCursor(cursor);

      const allCached = await getAllActivities();
      setState((previous) => ({
        ...previous,
        status: "synced",
        activities: allCached,
        newCount,
        lastSyncAt: cursor.lastSyncAt,
      }));
    } catch (error) {
      const cached = await getAllActivities();
      setState((previous) => ({
        ...previous,
        status: "error",
        activities: cached,
        errorMessage: error instanceof Error ? error.message : "Erreur de synchronisation inconnue.",
      }));
    }
  }, []);

  /**
   * Vide le stockage local, curseur compris : la synchronisation suivante
   * repart donc de zéro et rapatrie tout l'historique. C'est le seul moyen de
   * récupérer une sortie antérieure au curseur (une activité importée après
   * coup), qu'une passe incrémentale ne verrait jamais.
   */
  const clearStored = useCallback(async () => {
    await clearDatabase();
    setState({
      status: "cleared",
      activities: [],
      newCount: 0,
      lastSyncAt: null,
      errorMessage: null,
    });
  }, []);

  useEffect(() => {
    getAllActivities().then((cached) => {
      setState((previous) => ({ ...previous, activities: cached }));
    });
    void runSync();
  }, [runSync]);

  return { ...state, resync: runSync, clearStored };
}

export type SyncSnapshot = ReturnType<typeof useSync>;
