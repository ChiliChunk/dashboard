import { useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { resolvePeriod, type PeriodKind } from "../domain/period";
import { buildTimeline, type Granularity, type VolumeMetric } from "../domain/timeline";
import type { Activity, SportKind } from "../domain/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
const SPORT_VARS: Record<SportKind, string> = {
  run: "--sport-run",
  ride: "--sport-ride",
  hike: "--sport-hike",
  other: "--sport-other",
};

/** Le canvas ne résout pas `var(--x)` : il lui faut la couleur littérale du thème. */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Aplat de couleur, sans motif : mêmes teintes que la répartition par jour, pour
 * qu'un sport se reconnaisse d'un cadre à l'autre. La légende Chart.js nomme
 * chaque sport, ce qui garde le graphique lisible sans percevoir la teinte.
 */
function sportFill(sport: SportKind): string {
  return cssVar(SPORT_VARS[sport]);
}

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

/**
 * Graphique de progression (Chart.js) : barres empilées par sport, chaque sport
 * activable/désactivable depuis la légende, et un survol qui répond sur le
 * segment pointé plutôt que sur la barre entière.
 */
export function VolumeChart({ activities }: VolumeChartProps) {
  const [periodKind, setPeriodKind] = useState<PeriodKind>("current-year");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [metric, setMetric] = useState<VolumeMetric>("distance");

  const period = useMemo(() => resolvePeriod(periodKind), [periodKind]);
  const timeline = buildTimeline(activities, period, granularity, metric);
  const totals = timeline.map((bucket) => metricUnitValue(metric, bucket.value));
  const average = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const unitLabel = granularity === "week" ? "semaine" : "mois";

  // Les teintes viennent du thème, lu au montage plutôt qu'à chaque rendu.
  const fills = useMemo(() => {
    const entries = SPORT_ORDER.map((sport) => [sport, sportFill(sport)] as const);
    return Object.fromEntries(entries) as Record<SportKind, string>;
  }, []);
  const theme = useMemo(
    () => ({
      text: cssVar("--text"),
      muted: cssVar("--text-muted"),
      track: cssVar("--bg-track"),
      page: cssVar("--bg-page"),
    }),
    [],
  );

  const data: ChartData<"bar"> = {
    labels: timeline.map((bucket) => bucket.label),
    datasets: SPORT_ORDER.map((sport) => ({
      label: SPORT_LABELS[sport],
      data: timeline.map((bucket) => metricUnitValue(metric, bucket.bySport[sport])),
      backgroundColor: fills[sport],
      borderWidth: 0,
    })),
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    // « point » + « intersect » : le survol répond au segment réellement pointé,
    // donc un tooltip différent selon l'endroit de la barre.
    interaction: { mode: "point", intersect: true },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: theme.muted },
        border: { color: theme.track },
      },
      y: {
        stacked: true,
        // Origine non tronquée : une barre deux fois plus haute vaut deux fois plus.
        beginAtZero: true,
        grid: { color: theme.track },
        ticks: { color: theme.muted },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        // Chart.js gère lui-même l'activation/désactivation au clic sur une entrée.
        position: "bottom",
        labels: { color: theme.text, boxWidth: 12, boxHeight: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: theme.page,
        borderColor: theme.track,
        borderWidth: 1,
        titleColor: theme.text,
        bodyColor: theme.text,
        footerColor: theme.muted,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: (item) =>
            ` ${item.dataset.label} : ${(item.parsed.y ?? 0).toFixed(1)} ${METRIC_LABELS[metric]}`,
          // Le total ne compte que les sports encore affichés, pour rester
          // cohérent avec ce que la barre montre après un filtrage.
          footer: (items) => {
            const item = items[0];
            if (!item) return "";
            const total = item.chart.data.datasets.reduce((sum, dataset, index) => {
              if (!item.chart.isDatasetVisible(index)) return sum;
              const value = dataset.data[item.dataIndex];
              return sum + (typeof value === "number" ? value : 0);
            }, 0);
            return `Total : ${total.toFixed(1)} ${METRIC_LABELS[metric]}`;
          },
        },
      },
    },
  };

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

      <div className="chart-wrap">
        <Bar
          data={data}
          options={options}
          aria-label={`Graphique de ${METRIC_LABELS[metric].toLowerCase()} par ${unitLabel}`}
        />
      </div>
    </div>
  );
}
