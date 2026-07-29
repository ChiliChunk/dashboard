import { normalizeActivity } from "../domain/activity";
import { parseStravaActivity } from "../domain/schemas";
import type { Activity } from "../domain/types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const PAGE_SIZE = 200;

export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly headers: Headers,
  ) {
    super(message);
  }
}

async function stravaFetch(path: string, accessToken: string): Promise<Response> {
  const response = await fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new StravaApiError(`Requête Strava en échec : ${path}`, response.status, response.headers);
  }
  return response;
}

/** Pagine à 200 activités par page, en ne demandant que celles postérieures à `after` (CA6.2). */
export async function* fetchActivitiesSince(
  accessToken: string,
  after: number,
): AsyncGenerator<{ activities: Activity[]; headers: Headers }> {
  let page = 1;
  for (;;) {
    const response = await stravaFetch(
      `/athlete/activities?per_page=${PAGE_SIZE}&after=${after}&page=${page}`,
      accessToken,
    );
    const rawActivities = (await response.json()) as unknown[];
    if (rawActivities.length === 0) {
      return;
    }
    yield {
      activities: rawActivities.map((entry) => normalizeActivity(parseStravaActivity(entry))),
      headers: response.headers,
    };
    if (rawActivities.length < PAGE_SIZE) {
      return;
    }
    page += 1;
  }
}

export async function fetchActivityDetail(accessToken: string, id: number): Promise<Activity> {
  const response = await stravaFetch(`/activities/${id}`, accessToken);
  return normalizeActivity(parseStravaActivity(await response.json()));
}
