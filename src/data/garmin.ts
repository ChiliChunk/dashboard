import { normalizeGarminActivity } from "../domain/activity";
import { parseGarminActivity } from "../domain/schemas";
import type { Activity } from "../domain/types";

const GARMIN_SERVICE_BASE = "http://127.0.0.1:8799";

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
    throw new GarminServiceError(`Requête au service Garmin local en échec : ${path}`, response.status);
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
