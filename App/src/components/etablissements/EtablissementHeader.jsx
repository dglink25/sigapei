import { Link } from 'react-router-dom'
import { CalendarDays, Layers, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { roleCodeOf } from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import ThemeToggle from '../commun/ThemeToggle'
import '../../pages/commun/Portail.css'

const LIBELLES_ROLES = {
  administrateur: 'Administrateur',
  enseignant: 'Enseignant',
  personnel: 'Personnel',
  apprenant: 'Apprenant',
  parent: 'Parent',
}
const libelleRole = (code = '') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '')

const dateDuJour = () => {
  const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}


export default function EtablissementHeader({ slug, etablissementNom, etablissementLogoUrl, accueil }) {
  const { user, logout } = useAuth()
  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const prenom = nom.split(' ')[0]
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const role = libelleRole(roleCodeOf(user))

  return (
    <header className="portail-header">
      <div className="portail-accent" aria-hidden="true"><span /></div>

      <div className="portail-bar">
        <div className="portail-bar-inner">
          <Link to={lienEtablissement(slug, '/portail')} className="portail-bar-brand">
            <span className="portail-bar-logo">
              {etablissementLogoUrl
                ? <img src={etablissementLogoUrl} alt={etablissementNom ?? ''} style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:6 }} />
                : <img src="/sigapei.png" alt="" />}
            </span>
            <span className="portail-bar-texte">
              <span className="portail-bar-nom">{etablissementNom ?? ENV.appName}</span>
            </span>
          </Link>

          <div className="portail-bar-droite">
            <div className="portail-user">
              <span className="portail-avatar" aria-hidden="true">{initiales}</span>
              <span className="portail-user-texte">
                <span className="portail-user-nom">{nom}</span>
                {role && <span className="portail-user-role">{role}</span>}
              </span>
            </div>
            <span className="portail-sep" aria-hidden="true" />
            <div className="portail-bar-actions">
              <ThemeToggle className="portail-icon-btn" />
              <button type="button" className="portail-icon-btn portail-icon-btn--logout" onClick={() => logout('manual')} aria-label="Déconnexion" title="Déconnexion">
                <LogOut size={19} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {accueil && (
        <div className="portail-welcome">
          <div className="portail-welcome-inner">
            <div className="portail-welcome-texte">
              <h1 className="portail-welcome-titre">Bienvenue, <strong>{prenom}</strong></h1>
              <p className="portail-welcome-sub">Accédez aux services de votre établissement en toute sécurité.</p>
            </div>
            <div className="portail-chips">
              <span className="portail-chip"><CalendarDays size={15} aria-hidden="true" />{dateDuJour()}</span>
              <span className="portail-chip">
                <Layers size={15} aria-hidden="true" />
                {accueil.nbServices} service{accueil.nbServices > 1 ? 's' : ''} accessible{accueil.nbServices > 1 ? 's' : ''}
              </span>
              {accueil.complet && <span className="portail-chip portail-chip--or"><ShieldCheck size={15} aria-hidden="true" />Accès complet</span>}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
