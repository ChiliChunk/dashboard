import {
  endOfISOWeek,
  endOfYear,
  format,
  startOfISOWeek,
  startOfYear,
  subDays,
  subWeeks,
  subYears,
} from "date-fns";
import { fr } from "date-fns/locale";

export type PeriodKind = "current-week" | "last-30-days" | "current-year" | "previous-year" | "all-time";

export interface PeriodRange {
  kind: PeriodKind;
  label: string;
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
}

export interface WeekBucket {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Les `weekCount` dernières semaines ISO *révolues*, de la plus récente à la
 * plus ancienne — la semaine en cours est délibérément exclue : incomplète,
 * ses totaux ne se comparent pas à ceux d'une semaine entière. Indépendant de
 * la période sélectionnée : c'est un repère fixe sur la forme récente.
 */
export function lastWeeksBuckets(weekCount: number, now: Date = new Date()): WeekBucket[] {
  return Array.from({ length: weekCount }, (_, index) => {
    const reference = subWeeks(now, index + 1);
    const start = startOfISOWeek(reference);
    return {
      start,
      end: endOfISOWeek(reference),
      label: `Sem. du ${format(start, "d MMM", { locale: fr })}`,
    };
  });
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
        previousStart: subWeeks(start, 1),
        previousEnd: subWeeks(end, 1),
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
        previousStart: subDays(start, 30),
        previousEnd: start,
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
        previousStart: subYears(start, 1),
        previousEnd: subYears(end, 1),
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
        previousStart: subYears(start, 1),
        previousEnd: subYears(end, 1),
      };
    }
    case "all-time":
      return {
        kind,
        label: "Historique complet",
        start: null,
        end: now,
        previousStart: null,
        previousEnd: null,
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

export function isWithinPreviousPeriod(date: Date, period: PeriodRange): boolean {
  if (period.previousStart === null || period.previousEnd === null) return false;
  return date >= period.previousStart && date <= period.previousEnd;
}
