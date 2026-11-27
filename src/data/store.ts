import { openDB, type IDBPDatabase } from "idb";
import type { RenfoEntry } from "../domain/renfo";
import type { Activity, SyncCursor } from "../domain/types";

// Nom volontairement changé (ancien : "strava-dashboard") : ouvrir une base au
// nouveau nom abandonne de fait tout historique Strava resté en cache,
// conformément au cas limite « historique Strava déjà présent localement »
// (specs/002-source-garmin/spec.md, section 5).
export const ACTIVITY_DATABASE_NAME = "garmin-dashboard";
// Version 2 : ajout du magasin `renfo`. Le renfo se pointe à la main et ne
// vient pas de Garmin, il ne pouvait donc pas tenir dans `activities`.
const DATABASE_VERSION = 2;
const ACTIVITIES_STORE = "activities";
const META_STORE = "meta";
const RENFO_STORE = "renfo";
const CURSOR_KEY = "syncCursor";

// Connexion unique réutilisée : indexedDB.deleteDatabase (clearDatabase) reste
// bloqué indéfiniment tant qu'une connexion ouverte subsiste ailleurs — ouvrir
// une nouvelle connexion à chaque appel sans jamais la fermer provoquait
// exactement ce blocage (détecté par store.test.ts, corrigé ici).
let dbPromise: Promise<IDBPDatabase> | null = null;

function openDashboardDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(ACTIVITY_DATABASE_NAME, DATABASE_VERSION, {
      // Chaque magasin est créé s'il manque plutôt qu'à une version donnée :
      // la même fonction sert à la création d'une base neuve et à la montée de
      // version d'une base déjà remplie (celle du Raspberry, par exemple).
      upgrade(db) {
        if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
          const activityStore = db.createObjectStore(ACTIVITIES_STORE, { keyPath: "id" });
          activityStore.createIndex("byStartedAt", "startedAt");
          activityStore.createIndex("bySport", "sport");
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
        if (!db.objectStoreNames.contains(RENFO_STORE)) {
          db.createObjectStore(RENFO_STORE, { keyPath: "weekKey" });
        }
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

/**
 * Contrairement à Strava, la bibliothèque cliente Garmin n'a pas d'appel qui
 * renvoie le résumé d'une seule activité (l'équivalent le plus proche renvoie
 * des séries de mesures, pas les champs de synthèse) : le détail d'une sortie
 * est donc lu depuis les activités déjà synchronisées, jamais re-demandé.
 */
export async function getActivityById(id: number): Promise<Activity | null> {
  const db = await openDashboardDb();
  const activity = await db.get(ACTIVITIES_STORE, id);
  return (activity as Activity | undefined) ?? null;
}

/**
 * Semaines où le renfo a été pointé. Seules les semaines faites sont stockées :
 * décocher supprime l'entrée, l'absence valant « pas fait ».
 */
export async function getRenfoEntries(): Promise<RenfoEntry[]> {
  const db = await openDashboardDb();
  return db.getAll(RENFO_STORE) as Promise<RenfoEntry[]>;
}

export async function putRenfoEntry(entry: RenfoEntry): Promise<void> {
  const db = await openDashboardDb();
  await db.put(RENFO_STORE, entry);
}

export async function deleteRenfoEntry(weekKey: string): Promise<void> {
  const db = await openDashboardDb();
  await db.delete(RENFO_STORE, weekKey);
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

/**
 * Efface entièrement la base locale (CA1.6, déclenché à la déconnexion), à une
 * exception près : le journal de renfo est relu avant et réécrit après. Vider
 * le stockage sert à repartir d'un cache Garmin propre, et tout ce qui s'y
 * trouve d'autre est re-synchronisable — le renfo, pointé à la main, ne l'est
 * pas : aucune passe de synchronisation ne pourrait le reconstruire.
 */
export async function clearDatabase(): Promise<void> {
  const db = await openDashboardDb();
  const renfoEntries = (await db.getAll(RENFO_STORE)) as RenfoEntry[];
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(ACTIVITY_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error as Error);
    request.onblocked = () => resolve();
  });

  if (renfoEntries.length > 0) {
    const restored = await openDashboardDb();
    const tx = restored.transaction(RENFO_STORE, "readwrite");
    await Promise.all([...renfoEntries.map((entry) => tx.store.put(entry)), tx.done]);
  }
}
