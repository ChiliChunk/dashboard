import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import type { ActivityFilters } from "../domain/filter";
import type { SportKind } from "../domain/types";

const VALID_SPORTS: readonly SportKind[] = ["run", "ride", "hike", "other"];

function isSportKind(value: string): value is SportKind {
  return (VALID_SPORTS as readonly string[]).includes(value);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Filtres persistés dans la chaîne de requête (contrat de la section 5 du
 * plan : ?sport=run&from=2026-01-01) — survivent à un rechargement (CA3.4).
 */
export function useUrlFilters(): [ActivityFilters, (next: ActivityFilters) => void] {
  const search = useSearch();
  const [location, navigate] = useLocation();

  const filters = useMemo<ActivityFilters>(() => {
    const params = new URLSearchParams(search);
    const sportsParam = params.get("sport");
    const sports = sportsParam ? sportsParam.split(",").filter(isSportKind) : [];
    return {
      sports,
      from: parseDate(params.get("from")),
      to: parseDate(params.get("to")),
    };
  }, [search]);

  const setFilters = useCallback(
    (next: ActivityFilters) => {
      const params = new URLSearchParams();
      if (next.sports.length > 0) params.set("sport", next.sports.join(","));
      if (next.from) params.set("from", next.from.toISOString().slice(0, 10));
      if (next.to) params.set("to", next.to.toISOString().slice(0, 10));
      const query = params.toString();
      navigate(`${location}${query ? `?${query}` : ""}`);
    },
    [location, navigate],
  );

  return [filters, setFilters];
}
