/**
 * Segments de filtrage par statut, avec compteurs.
 * `options` : [{ valeur, libelle, compteur?, compteurVariante? ('or'|'rouge') }]
 */
export function PillsStatut({ options, valeur, onChange }) {
  return (
    <div className="pills" role="tablist" aria-label="Filtrer par statut">
      {options.map((option) => {
        const actif = option.valeur === valeur
        return (
          <button
            key={option.valeur}
            type="button"
            role="tab"
            aria-selected={actif}
            className={actif ? 'pill pill-actif' : 'pill'}
            onClick={() => onChange(option.valeur)}
          >
            {option.libelle}
            {option.compteur !== undefined && option.compteur !== null && (
              <span
                className={
                  option.compteurVariante
                    ? `compteur compteur-${option.compteurVariante}`
                    : 'compteur'
                }
              >
                {option.compteur}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
