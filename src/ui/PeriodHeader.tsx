import type { ReactNode } from "react";
import type { ActivityFilters } from "../domain/filter";
import type { PeriodRange } from "../domain/period";
import type { SportKind } from "../domain/types";

interface PeriodHeaderProps {
  period: PeriodRange;
  filters: ActivityFilters;
  onFiltersChange: (next: ActivityFilters) => void;
  children?: ReactNode;
}

const SPORT_LABELS: Record<SportKind, string> = {
  run: "Course à pied",
  ride: "Vélo",
  hike: "Randonnée",
  other: "Autre",
};

const ALL_SPORTS: SportKind[] = ["run", "ride", "hike", "other"];

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/**
 * Bandeau de période (CA2.9) et filtres partagés entre la synthèse et la liste
 * (CA3.2, CA3.4, CA3.5) : sport et intervalle de dates, chacun annulable
 * individuellement sans repartir de zéro.
 */
export function PeriodHeader({ period, filters, onFiltersChange, children }: PeriodHeaderProps) {
  const toggleSport = (sport: SportKind) => {
    const sports = filters.sports.includes(sport)
      ? filters.sports.filter((s) => s !== sport)
      : [...filters.sports, sport];
    onFiltersChange({ ...filters, sports });
  };

  const clearSport = (sport: SportKind) => {
    onFiltersChange({ ...filters, sports: filters.sports.filter((s) => s !== sport) });
  };

  const clearDates = () => onFiltersChange({ ...filters, from: null, to: null });

  const hasActiveFilters = filters.sports.length > 0 || filters.from !== null || filters.to !== null;

  return (
    <div className="card">
      <div className="period-header-top">
        <div>
          <p className="label">Période</p>
          <h2>{period.label}</h2>
        </div>
        <div className="period-header-controls">
          {children}
          <fieldset className="sport-filter">
            <legend className="label">Filtrer par sport</legend>
            {ALL_SPORTS.map((sport) => (
              <label key={sport} className="sport-toggle" data-sport={sport}>
                <input
                  type="checkbox"
                  checked={filters.sports.includes(sport)}
                  onChange={() => toggleSport(sport)}
                />
                {SPORT_LABELS[sport]}
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="date-filters">
        <label>
          Du{" "}
          <input
            type="date"
            value={toDateInputValue(filters.from)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                from: event.target.value ? new Date(event.target.value) : null,
              })
            }
          />
        </label>
        <label>
          Au{" "}
          <input
            type="date"
            value={toDateInputValue(filters.to)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                to: event.target.value ? new Date(event.target.value) : null,
              })
            }
          />
        </label>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <p className="label">Filtres actifs</p>
          {filters.sports.map((sport) => (
            <button key={sport} type="button" className="chip" onClick={() => clearSport(sport)}>
              {SPORT_LABELS[sport]} ✕
            </button>
          ))}
          {(filters.from !== null || filters.to !== null) && (
            <button type="button" className="chip" onClick={clearDates}>
              Dates ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
