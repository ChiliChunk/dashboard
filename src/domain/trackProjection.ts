import type { LatLng } from "./polyline";

export interface ProjectionSize {
  width: number;
  height: number;
  paddingRatio: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Projette des coordonnées géographiques sur une vue à l'échelle, nord en
 * haut (décision D5, option SVG nue). La longitude est compressée par
 * cos(latitude moyenne) pour compenser la distorsion de la projection plate.
 */
export function projectPoints(points: LatLng[], size: ProjectionSize): ScreenPoint[] {
  if (points.length === 0) return [];

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const longitudeScale = Math.cos((centerLat * Math.PI) / 180);

  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = (maxLng - minLng) * longitudeScale || 1e-6;
  const scale = Math.min(size.width / spanLng, size.height / spanLat) * size.paddingRatio;

  return points.map((point) => ({
    x: size.width / 2 + (point.lng - centerLng) * longitudeScale * scale,
    y: size.height / 2 - (point.lat - centerLat) * scale,
  }));
}

export function toSvgPointsAttribute(projected: ScreenPoint[]): string {
  return projected.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}
