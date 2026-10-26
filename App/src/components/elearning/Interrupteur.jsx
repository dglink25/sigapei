/**
 * Interrupteur (toggle) accessible : label cliquable, piste et bouton.
 * `desactive` verrouille l'état (lecture seule - ex. préférences du
 * tenant pour un rôle non administrateur).
 * Le style vit dans index.css (.interrupteur, .interrupteur-piste…).
 */
export function Interrupteur({
  nom,
  libelle,
  coche,
  onChange,
  desactive = false,
}) {
  return (
    <label
      className={
        desactive ? 'interrupteur interrupteur-desactive' : 'interrupteur'
      }
      htmlFor={nom}
    >
      <input
        id={nom}
        type="checkbox"
        checked={coche}
        disabled={desactive}
        onChange={(evenement) => onChange(evenement.target.checked)}
      />
      <span className="interrupteur-piste">
        <span className="interrupteur-bouton" />
      </span>
      {libelle}
    </label>
  )
}
