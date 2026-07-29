const WINDOW_MS = 15 * 60 * 1000;
const LOCAL_LIMIT = 180;

export class QuotaExceededError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Quota Strava atteint : nouvelle tentative différée.");
  }
}

function parseRateLimitPair(headerValue: string): number | null {
  const parts = headerValue.split(",").map((part) => Number(part.trim()));
  const fifteenMinuteValue = parts[1];
  return fifteenMinuteValue !== undefined && !Number.isNaN(fifteenMinuteValue)
    ? fifteenMinuteValue
    : null;
}

/**
 * Fenêtre glissante de 15 minutes, avec priorité aux en-têtes Strava sur le
 * compteur local dès qu'ils sont disponibles (article IV du plan).
 */
export class RequestQuota {
  private timestamps: number[] = [];
  private headerUsage: number | null = null;
  private headerLimit: number | null = null;

  recordHeaders(usage: string | null, limit: string | null): void {
    if (usage) this.headerUsage = parseRateLimitPair(usage);
    if (limit) this.headerLimit = parseRateLimitPair(limit);
  }

  private pruneWindow(now: number): void {
    const cutoff = now - WINDOW_MS;
    this.timestamps = this.timestamps.filter((timestamp) => timestamp > cutoff);
  }

  checkAndRecord(now: number = Date.now()): void {
    this.pruneWindow(now);

    const hasHeaderData = this.headerUsage !== null && this.headerLimit !== null;
    if (hasHeaderData) {
      if (this.headerUsage! >= this.headerLimit!) {
        throw new QuotaExceededError(WINDOW_MS);
      }
    } else if (this.timestamps.length >= LOCAL_LIMIT) {
      const oldest = this.timestamps[0] ?? now;
      throw new QuotaExceededError(oldest + WINDOW_MS - now);
    }

    this.timestamps.push(now);
  }
}
