/** Icône Material Symbols Outlined (police chargée dans index.html). */
export function Icone({ nom, classe = 'icone' }) {
  return (
    <span className={classe} aria-hidden="true">
      {nom}
    </span>
  )
}
