import { Link } from 'react-router-dom'
import { Construction, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { HOME_PATH, roleCodeOf } from '../../config/identite/routes'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './DashboardTemp.css'

export default function DashboardTemp() {
  const { user, logout } = useAuth()
  const roleCode = roleCodeOf(user)
  const nom = user?.nomComplet ?? user?.nom_complet ?? ''
  usePageTitle('Tableau de bord')

  return (
    <div className="dt-page">
      <div className="dt-card">
        <img src="/sigapei.png" alt={ENV.appName} className="dt-logo" />

        <div className="dt-icon">
          <Construction size={40} />
        </div>

        <h1 className="dt-title">Fonctionnalité non disponible</h1>
        <p className="dt-role">
          Rôle détecté : <strong>{roleCode.replace(/_/g, ' ')}</strong>
        </p>
        <p className="dt-msg">
          {nom && <>Bonjour <strong>{nom}</strong>. </>}
          Le tableau de bord pour le rôle <strong>« {roleCode.replace(/_/g, ' ')} »</strong> n'est
          pas encore disponible sur cette plateforme. Notre équipe travaille à l'activation
          progressive de chaque espace métier.
        </p>
        <p className="dt-sub">
          Contactez l'administrateur de votre établissement si vous pensez avoir reçu ce message par erreur.
        </p>

        <div className="dt-actions">
          <Link to={HOME_PATH} className="dt-btn dt-btn--ghost">
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>
          <button className="dt-btn" onClick={() => logout('manual')}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
