import { normalizeGarminActivity } from "../domain/activity";
import { parseGarminActivity } from "../domain/schemas";
import type { Activity } from "../domain/types";

// Le service Garmin tourne toujours sur la même machine que le serveur qui
// sert cette page : en déduire l'hôte permet d'ouvrir le dashboard depuis un
// autre poste du réseau local sans reconfigurer quoi que ce soit.
const GARMIN_SERVICE_BASE = `http://${globalThis.location?.hostname ?? "127.0.0.1"}:8799`;

export class GarminServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function garminFetch(path: string): Promise<Response> {
  const response = await fetch(`${GARMIN_SERVICE_BASE}${path}`);
  if (!response.ok) {
    // Le 429 vient de Garmin, pas du service local : l'annoncer comme une
    // panne enverrait l'utilisateur chercher au mauvais endroit, alors qu'il
    // n'a qu'à laisser passer quelques minutes.
    const message =
      response.status === 429
        ? "Garmin limite temporairement les requêtes. La synchronisation reprendra dans quelques minutes."
        : `Requête au service Garmin local en échec : ${path}`;
    throw new GarminServiceError(message, response.status);
  }
  return response;
}

/**
 * Une page d'activités, de la plus récente à la plus ancienne. Décider
 * lesquelles sont nouvelles n'appartient pas à cette couche : voir
 * `src/domain/incremental.ts` (CA1.3, CA1.4).
 */
export async function fetchActivityPage(offset: number, limit: number): Promise<Activity[]> {
  const response = await garminFetch(`/activities?offset=${offset}&limit=${limit}`);
  const rawActivities = (await response.json()) as unknown[];
  return rawActivities.map((entry) => normalizeGarminActivity(parseGarminActivity(entry)));
}
