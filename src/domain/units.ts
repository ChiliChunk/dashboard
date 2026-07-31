import type { SportKind } from "./types";

export function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null) return null;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

/** 0 m est une vraie valeur (parcours plat) : elle s'affiche, elle ne disparaît pas. */
export function formatElevation(elevationMeters: number | null): string | null {
  if (elevationMeters === null) return null;
  return `${Math.round(elevationMeters)} m`;
}

const ON_FOOT_SPORTS: SportKind[] = ["run", "hike"];

export function formatPace(
  sport: SportKind,
  distanceMeters: number | null,
  durationSeconds: number | null,
): string | null {
  if (distanceMeters === null || durationSeconds === null || distanceMeters === 0) {
    return null;
  }

  if (ON_FOOT_SPORTS.includes(sport)) {
    const secondsPerKm = durationSeconds / (distanceMeters / 1000);
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
  }

  const kmh = distanceMeters / 1000 / (durationSeconds / 3600);
  return `${kmh.toFixed(1)} km/h`;
}
