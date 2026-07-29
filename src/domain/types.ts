export type SportKind = "run" | "ride" | "hike" | "other";

export interface Activity {
  id: number;
  name: string;
  sport: SportKind;
  sportRaw: string;
  startedAt: Date;
  startedAtLocal: Date;
  distance: number | null;
  movingTime: number | null;
  elapsedTime: number | null;
  elevationGain: number | null;
  averageHeartrate: number | null;
  averageWatts: number | null;
  averageCadence: number | null;
  polyline: string | null;
  isManual: boolean;
}

export interface SyncCursor {
  athleteId: number;
  lastActivityStart: number;
  lastSyncAt: number;
  complete: boolean;
}
