import { PLANS, planWeekRange, type Plan, type RenfoCircuit } from "../domain/plan";
import { isRenfoDoneAt } from "../domain/renfo";
import { useRenfoLog } from "../data/renfoLog";

/**
 * Les circuits de renfo, en entier : le plan ne nomme qu'un circuit par
 * semaine (« Circuit C — trail (25') »), les exercices vivent ici. C'est une
 * page à part parce qu'on l'ouvre pour la suivre pendant la séance, pas pour
 * la croiser en lisant ses semaines.
 *
 * Elle lit le journal de pointage pour elle-même : elle n'est jamais affichée
 * en même temps que le tableau de bord, les deux ne peuvent donc pas diverger.
 */
export function RenfoView() {
  const renfo = useRenfoLog();
  const plans = PLANS.filter((plan) => plan.renfoCircuits.length > 0);

  if (plans.length === 0) {
    return (
      <div className="card">
        <p className="label">Renfo</p>
        <p className="caption muted">Aucun plan ne prescrit de renforcement.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {plans.map((plan) => (
        <div key={plan.id} className="stack">
          <div className="card">
            <p className="label">Renfo · {plan.name}</p>
            <p className="caption muted">
              Un circuit par semaine, à faire en une fois. Les semaines pointées se cochent depuis
              le plan ou depuis la carte du tableau de bord.
            </p>
          </div>
          {plan.renfoCircuits.map((circuit) => (
            <CircuitCard
              key={circuit.id}
              plan={plan}
              circuit={circuit}
              done={renfo.done}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CircuitCard({
  plan,
  circuit,
  done,
}: {
  plan: Plan;
  circuit: RenfoCircuit;
  done: ReadonlySet<string>;
}) {
  // Les semaines qui programment ce circuit, d'après le plan lui-même : la
  // colonne « quand » du document reste affichée telle quelle à côté, mais
  // c'est le plan qui fait foi pour le décompte.
  const weeks = plan.weeks.filter((week) => week.renfo?.circuitId === circuit.id);
  const doneCount = weeks.filter((week) => isRenfoDoneAt(done, week.start)).length;

  return (
    <div className="card renfo-circuit">
      <div className="renfo-circuit-head">
        <p className="label">{circuit.name}</p>
        <p className="caption muted">{circuit.format}</p>
      </div>

      <ol className="renfo-exercises">
        {circuit.exercises.map((exercise) => (
          <li key={exercise}>{exercise}</li>
        ))}
      </ol>

      {circuit.progression && (
        <p className="caption">
          <strong>Progression.</strong> {circuit.progression}
        </p>
      )}
      {circuit.note && <p className="caption muted">{circuit.note}</p>}

      <ul className="renfo-weeks">
        {weeks.map((week) => (
          <li
            key={week.number}
            data-done={isRenfoDoneAt(done, week.start) ? "true" : "false"}
            title={`Semaine ${week.number} · ${planWeekRange(week).start.toLocaleDateString("fr-FR")}`}
          >
            S{week.number}
          </li>
        ))}
      </ul>
      <p className="caption muted">
        {circuit.when} — {doneCount} sur {weeks.length} pointée
        {doneCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}
