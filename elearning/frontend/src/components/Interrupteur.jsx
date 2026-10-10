/**
 * Interrupteur (toggle) accessible : label cliquable, piste et bouton.
 * Le style vit dans index.css (.interrupteur, .interrupteur-piste…).
 */
export function Interrupteur({ nom, libelle, coche, onChange }) {
  return (
    <label className="interrupteur" htmlFor={nom}>
      <input
        id={nom}
        type="checkbox"
        checked={coche}
        onChange={(evenement) => onChange(evenement.target.checked)}
      />
      <span className="interrupteur-piste">
        <span className="interrupteur-bouton" />
      </span>
      {libelle}
    </label>
  )
}
