export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Décode une polyline encodée au format Google (utilisée par le champ
 * `map.summary_polyline` de Strava). Une entrée vide, nulle ou malformée
 * renvoie une liste vide plutôt que de lever une exception : l'algorithme
 * avance toujours dans la chaîne, il ne peut donc pas boucler indéfiniment.
 */
export function decodePolyline(encoded: string | null): LatLng[] {
  if (!encoded) return [];

  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
