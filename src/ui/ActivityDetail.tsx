import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useSession } from "../data/session";
import { fetchActivityDetail } from "../data/strava";
import { decodePolyline } from "../domain/polyline";
import type { Activity, SportKind } from "../domain/types";
import { formatDistance, formatDuration, formatElevation, formatPace } from "../domain/units";
import { EmptyState } from "./EmptyState";
import { TrackView } from "./TrackView";

const SPORT_LABELS: Record<SportKind, string> = {
  run: "Course à pied",
  ride: "Vélo",
  hike: "Randonnée",
  other: "Autre",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

/** Détail d'une sortie (CA4.2 → CA4.6). L'affichage du tracé lui-même est T052, en attente de l'arbitrage D5. */
export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !id) return;
    let cancelled = false;
    fetchActivityDetail(session.accessToken, Number(id))
      .then((result) => {
        if (!cancelled) setActivity(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Impossible de charger cette sortie pour le moment.");
      });
    return () => {
      cancelled = true;
    };
  }, [session, id]);

  if (loadError) {
    return (
      <div className="card" role="status">
        <p className="label">Erreur</p>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!activity) {
    return <EmptyState variant="loading" />;
  }

  const points = decodePolyline(activity.polyline);

  return (
    <div className="card">
      <h2>{activity.name}</h2>
      <p>{dateTimeFormatter.format(activity.startedAtLocal)}</p>
      <p>{SPORT_LABELS[activity.sport]}</p>

      <dl>
        <dt>Distance</dt>
        <dd>{formatDistance(activity.distance) ?? "non mesuré"}</dd>
        <dt>Durée de déplacement</dt>
        <dd>{formatDuration(activity.movingTime) ?? "non mesuré"}</dd>
        <dt>Durée totale</dt>
        <dd>{formatDuration(activity.elapsedTime) ?? "non mesuré"}</dd>
        <dt>Dénivelé positif</dt>
        <dd>{formatElevation(activity.elevationGain) ?? "non mesuré"}</dd>
        <dt>Allure / vitesse moyenne</dt>
        <dd>{formatPace(activity.sport, activity.distance, activity.movingTime) ?? "non mesuré"}</dd>
      </dl>

      {activity.averageHeartrate !== null && (
        <p>Fréquence cardiaque moyenne : {Math.round(activity.averageHeartrate)} bpm</p>
      )}
      {activity.averageWatts !== null && <p>Puissance moyenne : {Math.round(activity.averageWatts)} W</p>}
      {activity.averageCadence !== null && (
        <p>Cadence moyenne : {Math.round(activity.averageCadence)} tr/min</p>
      )}

      {points.length > 0 ? (
        <TrackView points={points} />
      ) : (
        <p>Aucun tracé disponible pour cette sortie.</p>
      )}

      <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noreferrer">
        Ouvrir sur Strava
      </a>
    </div>
  );
}
