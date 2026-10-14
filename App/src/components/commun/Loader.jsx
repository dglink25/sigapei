import './Loader.css'

/**
 * Loader universel SIGAPEI — charte graphique vert/or/crème.
 *
 * Modes :
 *   - "overlay"  : plein écran (session, soumission finale, page entière)
 *   - "inline"   : dans un conteneur (select en chargement, section de page)
 *   - "card"     : carte blanche centrée flottante (style référence)
 *   - "button"   : spinner minuscule pour les boutons (sans texte ni overlay)
 *
 * Usage :
 *   <Loader />                          → overlay plein écran par défaut
 *   <Loader mode="card" label="Envoi…" />
 *   <Loader mode="inline" size="sm" />
 *   <Loader mode="button" />
 */
export default function Loader({
  mode = 'overlay',
  label = 'Chargement…',
  size = 'md',         // 'sm' | 'md' | 'lg'
  showLabel = true,
}) {
  if (mode === 'button') {
    return (
      <span className="ld-spin ld-spin--btn" aria-hidden="true" />
    )
  }

  const spinner = (
    <span className={`ld-orbit ld-orbit--${size}`} aria-hidden="true">
      {/* Cercle piste */}
      <span className="ld-orbit__track" />
      {/* Logo au centre */}
      <span className="ld-orbit__center">
        <img src="/sigapei.png" alt="" className="ld-orbit__logo" />
      </span>
      {/* Point orbital */}
      <span className="ld-orbit__dot" />
    </span>
  )

  if (mode === 'card') {
    return (
      <div className="ld-card-wrap" aria-live="polite" role="status">
        <div className="ld-card">
          {spinner}
          {showLabel && <p className="ld-label">{label}</p>}
        </div>
      </div>
    )
  }

  if (mode === 'inline') {
    return (
      <div className="ld-inline" aria-live="polite" role="status">
        {spinner}
        {showLabel && <p className="ld-label ld-label--inline">{label}</p>}
      </div>
    )
  }

  // mode === 'overlay' (défaut)
  return (
    <div className="ld-overlay" aria-live="polite" role="status">
      <div className="ld-card">
        {spinner}
        {showLabel && <p className="ld-label">{label}</p>}
      </div>
    </div>
  )
}
