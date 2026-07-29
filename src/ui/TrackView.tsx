import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "../domain/polyline";
import { projectPoints, toSvgPointsAttribute } from "../domain/trackProjection";

interface TrackViewProps {
  points: LatLng[];
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 200;
const PADDING_RATIO = 0.9;

/**
 * Affichage du tracé (CA4.1), conforme à la décision D5 : SVG nu par défaut
 * (respecte ENF2 à la lettre), fond de carte OpenStreetMap activable à la
 * demande avec mention explicite avant activation.
 */
export function TrackView({ points }: TrackViewProps) {
  const [showMap, setShowMap] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMap || !mapContainerRef.current || points.length === 0) return;

    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current) return;

      const leafletMap = L.map(mapContainerRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(leafletMap);

      const latLngs = points.map((point): [number, number] => [point.lat, point.lng]);
      const polyline = L.polyline(latLngs, { color: "#9184d9", weight: 3 }).addTo(leafletMap);
      leafletMap.fitBounds(polyline.getBounds(), { padding: [16, 16] });

      map = leafletMap;
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [showMap, points]);

  if (points.length === 0) {
    return null;
  }

  const projected = projectPoints(points, {
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT,
    paddingRatio: PADDING_RATIO,
  });

  return (
    <div>
      {showMap ? (
        <div ref={mapContainerRef} style={{ height: "280px", borderRadius: "var(--radius-card)" }} />
      ) : (
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label="Tracé schématique de la sortie, sans fond de carte"
        >
          <polyline
            points={toSvgPointsAttribute(projected)}
            fill="none"
            stroke="var(--sport-run)"
            strokeWidth="2"
          />
        </svg>
      )}

      <button type="button" onClick={() => setShowMap((previous) => !previous)}>
        {showMap ? "Revenir au tracé schématique" : "Afficher le fond de carte"}
      </button>

      {!showMap && (
        <p className="label">
          Le fond de carte interroge OpenStreetMap, qui recevra la zone géographique de cette
          sortie.
        </p>
      )}
    </div>
  );
}
