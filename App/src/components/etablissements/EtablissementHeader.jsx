import { Link } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { SECURITY_PATH } from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import ThemeToggle from '../commun/ThemeToggle'
import '../../pages/commun/Portail.css'

/** Barre discrète de l'espace établissement : nom de l'établissement, accueil de l'utilisateur et actions du compte. */
export default function EtablissementHeader({ slug, etablissementNom, sousTitre }) {
  const { logout } = useAuth()
  return (
    <header className="portail-bar">
      <div className="portail-bar-inner">
        <Link to={lienEtablissement(slug, '/portail')} className="portail-bar-brand">
          <img src="/sigapei.png" alt="" className="portail-bar-logo" />
          <span className="portail-bar-texte">
            <span className="portail-bar-nom">{etablissementNom ?? ENV.appName}</span>
            {sousTitre && <span className="portail-bar-sub">{sousTitre}</span>}
          </span>
        </Link>
        <div className="portail-bar-actions">
          <ThemeToggle className="portail-icon-btn" />
          <Link to={SECURITY_PATH} className="portail-icon-btn" aria-label="Sécurité du compte" title="Sécurité du compte">
            <Settings size={19} aria-hidden="true" />
          </Link>
          <button type="button" className="portail-icon-btn portail-icon-btn--logout" onClick={() => logout('manual')} aria-label="Déconnexion" title="Déconnexion">
            <LogOut size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
