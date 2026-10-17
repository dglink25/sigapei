import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import './Bloc3D.css'

const REDUIT = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Taille du nom selon son mot le plus long (le texte doit tenir dans le grand cercle, en gros et en gras). */
function classeNom(nom = '') {
  const maxMot = Math.max(...nom.split(/\s+/).map((m) => m.length), 0)
  if (maxMot <= 8) return ''
  if (maxMot <= 9) return 'is-l'
  if (maxMot <= 11) return 'is-m'
  if (maxMot <= 12) return 'is-s'
  if (maxMot <= 14) return 'is-xs'
  return 'is-xxs'
}

function incliner(e) {
  if (REDUIT || e.pointerType !== 'mouse') return
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  e.currentTarget.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`)
  e.currentTarget.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
}
function redresser(e) {
  e.currentTarget.style.setProperty('--rx', '0deg')
  e.currentTarget.style.setProperty('--ry', '0deg')
}

/**
 * Bloc de service en relief : grand cercle = nom, petite pastille = numéro d'emplacement, plaque = action.
 * etat : 'actif' (lien « Se connecter ») | 'bientot' (accès accordé, interface à venir) | 'verrouille' | 'config'.
 */
export default function Bloc3D({ etat = 'actif', numero, icone: Icone, nom, pill, motif, to, index = 0 }) {
  const lien = etat === 'actif' || etat === 'config'
  const style = { '--i': index }
  const contenu = (
    <div className="bloc3d-body">
      <span className="bloc3d-plate" aria-hidden="true" />
      <span className="bloc3d-ring" aria-hidden="true" />
      <div className="bloc3d-hole">
        {etat === 'verrouille' && <span className="bloc3d-lock" aria-hidden="true"><Lock /></span>}
        <p className={`bloc3d-name ${classeNom(nom)}`}>{nom}</p>
      </div>
      <span className="bloc3d-num" aria-hidden="true">{Icone ? <Icone /> : <span>{numero}</span>}</span>
      <span className="bloc3d-pill" aria-hidden="true">
        <span>{etat === 'verrouille' && <Lock aria-hidden="true" />}{pill}</span>
      </span>
    </div>
  )
  const etiquette = `${nom}${numero ? `, service ${numero}` : ''} : ${motif ?? pill}`

  if (lien) {
    return (
      <Link to={to} className={`bloc3d is-${etat}`} style={style} aria-label={etiquette} onPointerMove={incliner} onPointerLeave={redresser}>
        {contenu}
      </Link>
    )
  }
  return (
    <div className={`bloc3d is-${etat}`} style={style} role="group" aria-label={etiquette} aria-disabled={etat === 'verrouille' ? 'true' : undefined} title={motif}>
      {contenu}
    </div>
  )
}
