import type { ReactNode } from "react";
import type { PeriodRange } from "../domain/period";

interface PeriodHeaderProps {
  period: PeriodRange;
  children?: ReactNode;
}

/**
 * Bandeau de période (CA2.9) : le libellé de la période résolue et les
 * contrôles qui la choisissent, passés par l'appelant.
 */
export function PeriodHeader({ period, children }: PeriodHeaderProps) {
  return (
    <div className="period-header-top">
      <p className="period-header-label">{period.label}</p>
      <div className="period-header-controls">{children}</div>
    </div>
  );
}
