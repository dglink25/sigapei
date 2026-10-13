import { Link } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { ENV } from '../config/env'
import { SECURITY_PATH, roleOf, useAuth } from './identite'
import './Home.css'

export default function Home() {
  const { user, logout } = useAuth()
  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-brand">
          <img src="/sigapei.png" alt={ENV.appName} />
          <div>
            <strong>{nom}</strong>
            <span>{user?.role?.libelle ?? roleOf(user) ?? ''}</span>
          </div>
        </div>
        <button type="button" className="home-logout" onClick={() => logout('manual')}>
          <LogOut size={18} /> Se déconnecter
        </button>
      </header>

      <main className="home-main">
        <section className="home-card">
          <h2>Bienvenue sur {ENV.appName}</h2>
          <p>Vous êtes connecté. Les modules de la plateforme apparaîtront ici.</p>
          <Link to={SECURITY_PATH} className="home-link"><ShieldCheck size={18} /> Sécurité du compte</Link>
        </section>
      </main>
    </div>
  )
}
