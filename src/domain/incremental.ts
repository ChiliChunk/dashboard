import type { Activity } from "./types";

/**
 * Le curseur de synchronisation est un epoch en secondes sur l'instant GMT de
 * départ. Il doit être calculé ici et nulle part ailleurs : comparer un
 * horodatage local à un curseur GMT décale la frontière du fuseau horaire et
 * fait ressortir indéfiniment la dernière activité comme « nouvelle ».
 */
export function activityStartEpoch(activity: Activity): number {
  return Math.floor(activity.startedAt.getTime() / 1000);
}

export interface FreshSelection {
  /** Activités postérieures au curseur, donc absentes du stockage local. */
  fresh: Activity[];
  /** Vrai dès qu'une activité déjà stockée apparaît dans la page. */
  reachedKnown: boolean;
}

/**
 * Les pages arrivent de la plus récente à la plus ancienne : dès qu'une
 * activité déjà connue s'y trouve, tout ce qui suit est connu aussi et la
 * pagination peut s'arrêter (CA1.3, CA1.4). C'est ce qui permet de ne
 * rapatrier que les nouvelles sorties à chaque visite.
 */
export function selectFreshActivities(page: Activity[], afterEpoch: number): FreshSelection {
  const fresh = page.filter((activity) => activityStartEpoch(activity) > afterEpoch);
  return { fresh, reachedKnown: fresh.length < page.length };
}

/**
 * Fusion par identifiant. Indispensable parce qu'une passe interrompue écrit
 * des activités sans avancer le curseur : la passe suivante les redemande, et
 * un simple ajout les compterait deux fois dans la synthèse.
 */
export function mergeActivities(existing: Activity[], incoming: Activity[]): Activity[] {
  const byId = new Map(existing.map((activity) => [activity.id, activity]));
  for (const activity of incoming) {
    byId.set(activity.id, activity);
  }
  return [...byId.values()];
}

/** Curseur à retenir après une passe : le départ le plus récent rencontré. */
export function latestStartEpoch(activities: Activity[], fallback: number): number {
  return activities.reduce(
    (latest, activity) => Math.max(latest, activityStartEpoch(activity)),
    fallback,
  );
}
