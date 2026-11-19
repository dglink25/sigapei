/**
 * PageBanner - Bandeau de titre léger pour les pages internes.
 * Remplace AccueilHero mode="page" : pas de re-rendu du hero,
 * pas d'image de fond rechargée, navigation fluide.
 *
 * Usage :
 *   <PageBanner titre="Formations" fil={[{ label:'Accueil', href:base }, { label:'Formations' }]} />
 */
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'

export default function PageBanner({ titre, fil = [], retour = null }) {
  const navigate = useNavigate()

  return (
    <div className="pgb">
      <div className="pgb-inner ae2-container">

        {/* Fil d'Ariane */}
        {fil.length > 0 && (
          <nav className="pgb-fil" aria-label="Fil d'Ariane">
            {fil.map((item, i) => (
              <span key={i} className="pgb-fil-item">
                {i > 0 && <ChevronRight size={12} className="pgb-sep" />}
                {item.href
                  ? <Link to={item.href} className="pgb-fil-link">{item.label}</Link>
                  : <span className="pgb-fil-current">{item.label}</span>
                }
              </span>
            ))}
          </nav>
        )}

        <div className="pgb-row">
          {/* Bouton retour optionnel */}
          {retour && (
            <button
              type="button"
              className="pgb-back"
              onClick={() => typeof retour === 'string' ? navigate(retour) : navigate(-1)}
              aria-label="Retour"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 className="pgb-titre">{titre}</h1>
        </div>

      </div>
    </div>
  )
}
