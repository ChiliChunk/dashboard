/**
 * Diamètre de l'anneau, en pixels. Dimensionné pour tenir dans la plus étroite
 * des cartes de synthèse (≈ 123 px de contenu en mobile) tout en laissant les
 * chiffres respirer en son centre.
 */
const SIZE = 112;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type TargetMetric = "duration" | "elevation";

interface TargetRingProps {
  /** Jamais affiché : sert à décrire le cadran aux technologies d'assistance. */
  label: string;
  metric: TargetMetric;
  /** Réalisé et cible dans l'unité brute de la grandeur (secondes, mètres) : c'est ce qui donne l'arc. */
  done: number;
  target: number;
  /**
   * Textes affichés, fournis déjà formatés : l'unité n'appartient qu'à la
   * cible (« 130 » puis « /700 m »), la répéter des deux côtés alourdirait la
   * lecture dans un espace aussi contraint.
   */
  doneText: string;
  targetText: string;
}

/**
 * Cible du plan sous forme de cadran : le tour complet vaut la cible, l'arc
 * plein la part déjà couverte, et les deux chiffres se lisent au centre. Au-delà
 * de 100 % l'arc reste plein et passe au vert — dépasser une cible n'est pas un
 * débordement, c'est un quota rempli, la même lecture que les marqueurs des
 * semaines révolues.
 *
 * Aucun libellé visible : le cadran est déjà dans une carte qui nomme sa
 * grandeur, et la forme « réalisé sur cible » se lit sans légende.
 */
export function TargetRing({ label, metric, done, target, doneText, targetText }: TargetRingProps) {
  const ratio = target > 0 ? done / target : 0;
  const met = ratio >= 1;
  const arc = Math.min(1, ratio);

  return (
    <div
      className="target-ring"
      data-metric={metric}
      data-met={met ? "true" : undefined}
      role="img"
      aria-label={`${label} : ${doneText} sur ${targetText}, ${Math.round(ratio * 100)} %`}
    >
      <div className="target-ring-dial">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle
            className="target-ring-track"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
            fill="none"
          />
          <circle
            className="target-ring-arc"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - arc)}
          />
        </svg>
        {/* Déjà porté par l'`aria-label` du cadran : ne pas le faire relire deux fois. */}
        <div className="target-ring-inner" aria-hidden="true">
          <span className="target-ring-done">{doneText}</span>
          <span className="target-ring-target">/{targetText}</span>
        </div>
      </div>
    </div>
  );
}
