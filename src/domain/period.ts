import {
  endOfISOWeek,
  endOfYear,
  format,
  startOfISOWeek,
  startOfYear,
  subDays,
  subYears,
} from "date-fns";
import { fr } from "date-fns/locale";

export type PeriodKind = "current-week" | "last-30-days" | "current-year" | "previous-year" | "all-time";

export interface PeriodRange {
  kind: PeriodKind;
  label: string;
  start: Date | null;
  end: Date;
}

/** Résout une période sélectionnable en bornes exactes (CA2.4) avec un libellé en toutes lettres (CA2.9). */
export function resolvePeriod(kind: PeriodKind, now: Date = new Date()): PeriodRange {
  switch (kind) {
    case "current-week": {
      const start = startOfISOWeek(now);
      const end = endOfISOWeek(now);
      return {
        kind,
        label: `Semaine du ${format(start, "d MMMM", { locale: fr })} au ${format(end, "d MMMM yyyy", { locale: fr })}`,
        start,
        end,
      };
    }
    case "last-30-days": {
      const end = now;
      const start = subDays(now, 30);
      return {
        kind,
        label: `30 derniers jours (${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })})`,
        start,
        end,
      };
    }
    case "current-year": {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        kind,
        label: `Année ${format(now, "yyyy")}`,
        start,
        end,
      };
    }
    case "previous-year": {
      const yearAgo = subYears(now, 1);
      const start = startOfYear(yearAgo);
      const end = endOfYear(yearAgo);
      return {
        kind,
        label: `Année ${format(yearAgo, "yyyy")}`,
        start,
        end,
      };
    }
    case "all-time":
      return {
        kind,
        label: "Historique complet",
        start: null,
        end: now,
      };
  }
}

/** Bornes d'une période sous forme compacte (« 27 juil. – 2 août »), pour un affichage accolé à un autre élément. */
export function formatCompactRange(period: PeriodRange): string | null {
  if (period.start === null) return null;
  return `${format(period.start, "d MMM", { locale: fr })} – ${format(period.end, "d MMM", { locale: fr })}`;
}

export function isWithinPeriod(date: Date, period: PeriodRange): boolean {
  if (period.start === null) return date <= period.end;
  return date >= period.start && date <= period.end;
}

