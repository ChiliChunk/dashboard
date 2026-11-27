import { useMemo } from "react";
import { planWeekAt, renfoCircuitFor, planById } from "../domain/plan";
import { isRenfoDoneAt } from "../domain/renfo";
import type { RenfoLogSnapshot } from "../data/renfoLog";

interface RenfoWeekCardProps {
  renfo: RenfoLogSnapshot;
}

/**
 * Le renfo de la semaine en cours, et rien d'autre : c'est la question qu'on
 * se pose en ouvrant le tableau de bord, et elle ne doit dépendre ni de la
 * semaine sélectionnée plus bas ni de la présence d'activités — la carte est
 * donc rendue hors des cartes de synthèse, qui disparaissent sur une semaine
 * encore vide. Le pointage porte sur la semaine du calendrier, y compris hors
 * des semaines d'un plan : du gainage fait entre deux plans reste du gainage
 * fait.
 */
export function RenfoWeekCard({ renfo }: RenfoWeekCardProps) {
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => planWeekAt(today), [today]);
  const plan = week ? planById(week.planId) : null;
  const circuit = plan && week ? renfoCircuitFor(plan, week) : null;
  const done = isRenfoDoneAt(renfo.done, today);

  return (
    <div className="card renfo-week" data-done={done ? "true" : "false"}>
      <div className="renfo-week-text">
        <p className="label">Renfo cette semaine</p>
        <p className="renfo-week-prescription">
          {week?.renfo
            ? week.renfo.instruction
            : week
              ? "Aucun renfo prescrit cette semaine par le plan"
              : "Hors plan cette semaine — à faire quand même si l'envie est là"}
        </p>
        {circuit && <p className="caption muted">{circuit.format}</p>}
      </div>

      <label className="renfo-week-check">
        <input
          type="checkbox"
          checked={done}
          disabled={!renfo.ready}
          onChange={(event) => renfo.toggle(today, event.target.checked)}
        />
        <span>{done ? "Fait" : "Pas encore fait"}</span>
      </label>
    </div>
  );
}
