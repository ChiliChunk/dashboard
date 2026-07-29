import { openDB, type IDBPDatabase } from "idb";
import type { Activity, SyncCursor } from "../domain/types";

export const ACTIVITY_DATABASE_NAME = "strava-dashboard";
const DATABASE_VERSION = 1;
const ACTIVITIES_STORE = "activities";
const META_STORE = "meta";
const CURSOR_KEY = "syncCursor";

// Connexion unique réutilisée : indexedDB.deleteDatabase (clearDatabase) reste
// bloqué indéfiniment tant qu'une connexion ouverte subsiste ailleurs — ouvrir
// une nouvelle connexion à chaque appel sans jamais la fermer provoquait
// exactement ce blocage (détecté par store.test.ts, corrigé ici).
let dbPromise: Promise<IDBPDatabase> | null = null;

function openDashboardDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(ACTIVITY_DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        const activityStore = db.createObjectStore(ACTIVITIES_STORE, { keyPath: "id" });
        activityStore.createIndex("byStartedAt", "startedAt");
        activityStore.createIndex("bySport", "sport");
        db.createObjectStore(META_STORE);
      },
    });
  }
  return dbPromise;
}

export async function putActivities(activities: Activity[]): Promise<void> {
  const db = await openDashboardDb();
  const tx = db.transaction(ACTIVITIES_STORE, "readwrite");
  await Promise.all([...activities.map((activity) => tx.store.put(activity)), tx.done]);
}

export async function getAllActivities(): Promise<Activity[]> {
  const db = await openDashboardDb();
  return db.getAll(ACTIVITIES_STORE);
}

export async function getSyncCursor(): Promise<SyncCursor | null> {
  const db = await openDashboardDb();
  const cursor = await db.get(META_STORE, CURSOR_KEY);
  return (cursor as SyncCursor | undefined) ?? null;
}

export async function putSyncCursor(cursor: SyncCursor): Promise<void> {
  const db = await openDashboardDb();
  await db.put(META_STORE, cursor, CURSOR_KEY);
}

/** Efface entièrement la base locale (CA1.6, déclenché à la déconnexion). */
export async function clearDatabase(): Promise<void> {
  const db = await openDashboardDb();
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(ACTIVITY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error as Error);
    request.onblocked = () => resolve();
  });
}
