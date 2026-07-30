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

/** Récupération incrémentale depuis le service Garmin local (CA1.3, CA1.4). */
export async function fetchActivitiesSince(after: number): Promise<Activity[]> {
  const response = await garminFetch(`/activities?after=${after}`);
  const rawActivities = (await response.json()) as unknown[];
  return rawActivities.map((entry) => normalizeGarminActivity(parseGarminActivity(entry)));
}
