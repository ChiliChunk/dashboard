type EmptyStateVariant = "loading" | "empty-period" | "no-account-activity" | "no-filter-match";

interface EmptyStateProps {
  variant: EmptyStateVariant;
}

const MESSAGES: Record<EmptyStateVariant, { title: string; body: string }> = {
  loading: {
    title: "Chargement…",
    body: "Récupération de vos données en cours.",
  },
  "empty-period": {
    title: "Aucune sortie sur cette période",
    body: "Choisissez une autre période, ou élargissez vos filtres.",
  },
  "no-account-activity": {
    title: "Aucune sortie enregistrée",
    body: "Dès que votre première activité sera synchronisée, elle apparaîtra ici.",
  },
  "no-filter-match": {
    title: "Aucun résultat pour ces filtres",
    body: "Essayez d'élargir l'intervalle de dates ou les sports sélectionnés.",
  },
};

/** États vides distincts entre eux et du chargement (CA2.5, CA3.7, cas « compte sans activité »). */
export function EmptyState({ variant }: EmptyStateProps) {
  const message = MESSAGES[variant];
  return (
    <div className="card" role="status">
      <p className="label">{message.title}</p>
      <p>{message.body}</p>
    </div>
  );
}
