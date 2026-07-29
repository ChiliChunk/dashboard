import { useMemo, useState } from "react";
import { resolvePeriod, type PeriodKind } from "../domain/period";
import { buildAxisScale } from "../domain/scale";
import { buildTimeline, type Granularity, type VolumeMetric } from "../domain/timeline";
import type { Activity, SportKind } from "../domain/types";

const PERIOD_OPTIONS: Array<{ kind: PeriodKind; label: string }> = [
  { kind: "current-week", label: "Semaine en cours" },
  { kind: "last-30-days", label: "30 derniers jours" },
  { kind: "current-year", label: "Année en cours" },
  { kind: "previous-year", label: "Année précédente" },
  { kind: "all-time", label: "Historique complet" },
];

const METRIC_LABELS: Record<VolumeMetric, string> = {
  distance: "Distance (km)",
  duration: "Durée (h)",
  elevation: "Dénivelé (m)",
};

const SPORT_ORDER: SportKind[] = ["run", "ride", "hike", "other"];
const SPORT_LABELS: Record<SportKind, string> = {
  run: "Course à pied",
  ride: "Vélo",
  hike: "Randonnée",
  other: "Autre",
};
const SPORT_FILL: Record<SportKind, string> = {
  run: "var(--sport-run)",
  ride: "url(#pattern-ride)",
  hike: "url(#pattern-hike)",
  other: "url(#pattern-other)",
};

function metricUnitValue(metric: VolumeMetric, rawValue: number): number {
  switch (metric) {
    case "distance":
      return rawValue / 1000;
    case "duration":
      return rawValue / 3600;
    case "elevation":
      return rawValue;
  }
}

interface VolumeChartProps {
  activities: Activity[];
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const BASELINE_Y = CHART_HEIGHT - 20;
const PLOT_HEIGHT = CHART_HEIGHT - 40;
const BAR_GAP = 4;

/**
 * Graphique de progression écrit à la main en SVG (décision D3 du plan) :
 * choix de grandeur (CA5.2), ventilation par sport avec motif + teinte
 * (CA5.7, ENF6), survol/focus donnant la valeur exacte (CA5.6), axe non
 * tronqué (CA5.5), moyenne affichée (CA5.8).
 */
export function VolumeChart({ activities }: VolumeChartProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("current-year");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [metric, setMetric] = useState<VolumeMetric>("distance");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const period = useMemo(() => resolvePeriod(periodKind), [periodKind]);
  const timeline = buildTimeline(activities, period, granularity, metric);
  const values = timeline.map((bucket) => metricUnitValue(metric, bucket.value));
  const scale = buildAxisScale(values);
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const barWidth = timeline.length > 0 ? CHART_WIDTH / timeline.length - BAR_GAP : 0;
  const unitLabel = granularity === "week" ? "semaine" : "mois";

  return (
    <div className="card">
      <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
        <label>
          Période{" "}
          <select value={periodKind} onChange={(event) => setPeriodKind(event.target.value as PeriodKind)}>
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.kind} value={option.kind}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grandeur{" "}
          <select value={metric} onChange={(event) => setMetric(event.target.value as VolumeMetric)}>
            <option value="distance">Distance</option>
            <option value="duration">Durée</option>
            <option value="elevation">Dénivelé</option>
          </select>
        </label>
        <label>
          Unité de temps{" "}
          <select
            value={granularity}
            onChange={(event) => setGranularity(event.target.value as Granularity)}
          >
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
        </label>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`Graphique de ${METRIC_LABELS[metric].toLowerCase()} par ${unitLabel}`}
      >
        <defs>
          <pattern id="pattern-ride" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--sport-ride)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bg-page)" strokeWidth="2" />
          </pattern>
          <pattern id="pattern-hike" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="var(--sport-hike)" />
            <line x1="0" y1="0" x2="6" y2="6" stroke="var(--bg-page)" strokeWidth="1" />
            <line x1="6" y1="0" x2="0" y2="6" stroke="var(--bg-page)" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-other" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="var(--sport-other)" />
            <circle cx="3" cy="3" r="1" fill="var(--bg-page)" />
          </pattern>
        </defs>

        <line x1={0} y1={BASELINE_Y} x2={CHART_WIDTH} y2={BASELINE_Y} stroke="var(--text-muted)" />

        {timeline.map((bucket, index) => {
          const x = index * (barWidth + BAR_GAP);
          let cumulative = 0;
          const segments = SPORT_ORDER.map((sport) => {
            const sportRawValue = bucket.bySport[sport];
            const sportValue = metricUnitValue(metric, sportRawValue);
            if (sportValue <= 0) return null;
            const segmentHeight = scale.max > 0 ? (sportValue / scale.max) * PLOT_HEIGHT : 0;
            const y = BASELINE_Y - cumulative - segmentHeight;
            cumulative += segmentHeight;
            return { sport, y, segmentHeight };
          });

          return (
            <g key={bucket.start.toISOString()}>
              {segments.map(
                (segment) =>
                  segment && (
                    <rect
                      key={segment.sport}
                      x={x}
                      y={segment.y}
                      width={Math.max(barWidth, 1)}
                      height={segment.segmentHeight}
                      fill={SPORT_FILL[segment.sport]}
                    />
                  ),
              )}
              <rect
                tabIndex={0}
                role="button"
                aria-label={`${bucket.label} : ${(values[index] ?? 0).toFixed(1)} ${METRIC_LABELS[metric]}`}
                x={x}
                y={BASELINE_Y - cumulative}
                width={Math.max(barWidth, 1)}
                height={Math.max(cumulative, PLOT_HEIGHT)}
                fill="transparent"
                onMouseEnter={() => setFocusedIndex(index)}
                onFocus={() => setFocusedIndex(index)}
                onMouseLeave={() => setFocusedIndex(null)}
                onBlur={() => setFocusedIndex(null)}
              />
            </g>
          );
        })}
      </svg>

      <div style={{ display: "flex", gap: "12px" }}>
        {SPORT_ORDER.map((sport) => (
          <span key={sport} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
            <span
              aria-hidden="true"
              style={{ width: 12, height: 12, background: SPORT_FILL[sport], display: "inline-block" }}
            />
            {SPORT_LABELS[sport]}
          </span>
        ))}
      </div>

      {focusedIndex !== null && timeline[focusedIndex] && (
        <p role="status">
          {timeline[focusedIndex]!.label} : {(values[focusedIndex] ?? 0).toFixed(1)}{" "}
          {METRIC_LABELS[metric]}
        </p>
      )}

      <p>
        Moyenne : {average.toFixed(1)} {METRIC_LABELS[metric]} / {unitLabel}
      </p>
      <p className="label">
        Axe vertical : 0 à {scale.max.toFixed(0)} — origine non tronquée
      </p>
    </div>
  );
}
