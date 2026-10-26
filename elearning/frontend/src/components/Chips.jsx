/**
 * Liste de chips amovibles (classes, mots-clés) avec boutons d'ajout rapide.
 * - `valeurs` : chaînes affichées en chips ;
 * - `onRetirer(valeur)` : appelé au clic sur la croix d'une chip ;
 * - `ajouts` : propositions cliquables en « + quick add » ;
 * - `onAjouter(proposition)` : appelé au clic sur un quick add.
 */
export function Chips({ valeurs, onRetirer, ajouts = [], onAjouter }) {
  return (
    <div className="chips">
      {valeurs.map((valeur) => (
        <span key={valeur} className="chip">
          {valeur}
          <button
            type="button"
            className="chip-suppr"
            aria-label={`Retirer ${valeur}`}
            onClick={() => onRetirer(valeur)}
          >
            ✕
          </button>
        </span>
      ))}
      {ajouts
        .filter((proposition) => !valeurs.includes(proposition))
        .map((proposition) => (
          <button
            key={proposition}
            type="button"
            className="bouton-ajout-chip"
            onClick={() => onAjouter(proposition)}
          >
            + {proposition}
          </button>
        ))}
    </div>
  )
}
