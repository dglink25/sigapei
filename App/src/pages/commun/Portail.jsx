import { Link } from 'react-router-dom'
import {
  BookOpen, Calendar, GraduationCap, FileText,
  DollarSign, UserCheck, ClipboardList, BarChart3,
  Library, Cpu, LogOut, Settings, Bell, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { SECURITY_PATH, roleCodeOf } from '../../config/identite/routes'
import ThemeToggle from '../../components/commun/ThemeToggle'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './Portail.css'

const MODULES = [
  {
    id: 'scolarite',
    titre: 'Scolarité',
    description: 'Inscription, dossiers, attestations',
    icon: GraduationCap,
    dispo: false,
  },
  {
    id: 'cours',
    titre: 'Cours & E-learning',
    description: 'Accéder aux cours en ligne',
    icon: BookOpen,
    dispo: false,
  },
  {
    id: 'emploi-du-temps',
    titre: 'Emploi du temps',
    description: 'Consulter votre planning',
    icon: Calendar,
    dispo: false,
  },
  {
    id: 'notes',
    titre: 'Notes & Bulletins',
    description: 'Résultats et relevés de notes',
    icon: ClipboardList,
    dispo: false,
  },
  {
    id: 'finance',
    titre: 'Finance',
    description: 'Paiements et reçus',
    icon: DollarSign,
    dispo: false,
  },
  {
    id: 'inscription',
    titre: 'Inscription',
    description: 'Dossier d\'admission',
    icon: UserCheck,
    dispo: false,
  },
  {
    id: 'bibliotheque',
    titre: 'Bibliothèque',
    description: 'Ressources pédagogiques',
    icon: Library,
    dispo: false,
  },
  {
    id: 'rapports',
    titre: 'Rapports',
    description: 'Statistiques et bilans',
    icon: BarChart3,
    dispo: false,
  },
  {
    id: 'cahier-texte',
    titre: 'Cahier de texte',
    description: 'Suivi des leçons',
    icon: FileText,
    dispo: false,
  },
  {
    id: 'outils',
    titre: 'Outils numériques',
    description: 'Applications disponibles',
    icon: Cpu,
    dispo: false,
  },
]

export default function Portail() {
  const { user, logout } = useAuth()
  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  usePageTitle('Portail')
  const roleCode = roleCodeOf(user)
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="portail-shell">

      {/* ── Header ── */}
      <header className="portail-header">
        <div className="portail-header-left">
          <img src="/sigapei.png" alt={ENV.appName} className="portail-logo" />
          <span className="portail-appname">{ENV.appName}</span>
        </div>
        <div className="portail-header-right">
          <button className="portail-icon-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <ThemeToggle className="portail-icon-btn" />
          <Link to={SECURITY_PATH} className="portail-icon-btn" aria-label="Paramètres">
            <Settings size={20} />
          </Link>
          <div className="portail-user-chip">
            <span className="portail-avatar">{initiales}</span>
            <span className="portail-user-name">{nom.split(' ')[0]}</span>
          </div>
          <button
            className="portail-icon-btn portail-icon-btn--logout"
            onClick={() => logout('manual')}
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* ── Corps ── */}
      <main className="portail-main">

        {/* Bandeau de bienvenue */}
        <section className="portail-hero">
          <div className="portail-hero-text">
            <h1>Bienvenue, <strong>{nom.split(' ')[0]}</strong></h1>
            <p>Accédez à vos services SIGAPEI depuis ce portail.</p>
          </div>
          {roleCode && (
            <span className="portail-role-badge">{roleCode.replace(/_/g, ' ')}</span>
          )}
        </section>

        {/* Grille de modules */}
        <section className="portail-section">
          <h2 className="portail-section-title">Mes services</h2>
          <div className="portail-grid">
            {MODULES.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.id}
                  className={`portail-card ${mod.dispo ? '' : 'portail-card--soon'}`}
                >
                  <div className="portail-card-icon">
                    <Icon size={32} aria-hidden="true" />
                  </div>
                  <p className="portail-card-titre">{mod.titre}</p>
                  <p className="portail-card-desc">{mod.description}</p>
                  {mod.dispo ? (
                    <Link to={mod.path ?? '#'} className="portail-card-btn">
                      Accéder <ChevronRight size={14} />
                    </Link>
                  ) : (
                    <span className="portail-card-soon">Bientôt disponible</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="portail-footer">
        <span>© {new Date().getFullYear()} {ENV.appName}</span>
        <Link to={SECURITY_PATH}>Sécurité du compte</Link>
        <button className="portail-footer-logout" onClick={() => logout('manual')}>
          <LogOut size={14} /> Déconnexion
        </button>
      </footer>
    </div>
  )
}
