import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText, BarChart3,
  Settings, LogOut, Bell, ChevronRight, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, Menu, X
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { SECURITY_PATH } from '../../config/identite/routes'
import ThemeToggle from '../../components/commun/ThemeToggle'
import './Dashboard.css'

const NAV_ITEMS = [
  {
    groupe: 'VUE D\'ENSEMBLE',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/admin/dashboard' },
      { id: 'compte',    label: 'Mon compte',       icon: Users,           path: SECURITY_PATH },
    ],
  },
  {
    groupe: 'PILOTAGE',
    items: [
      { id: 'indicateurs', label: 'Indicateurs',         icon: BarChart3,  path: '/admin/indicateurs' },
      { id: 'rapports',    label: 'Rapports statistiques', icon: FileText, path: '/admin/rapports' },
    ],
  },
  {
    groupe: 'ESPACES MÉTIER',
    items: [
      { id: 'demandes',      label: 'Demandes',        icon: FileText,   path: '/admin/demandes' },
      { id: 'etablissements', label: 'Établissements', icon: Building2,  path: '/admin/etablissements' },
      { id: 'utilisateurs',  label: 'Utilisateurs',    icon: Users,      path: '/admin/utilisateurs' },
    ],
  },
  {
    groupe: 'ADMINISTRATION',
    items: [
      { id: 'parametres', label: 'Paramètres', icon: Settings, path: SECURITY_PATH },
    ],
  },
]

const STATS = [
  { label: 'Demandes soumises',    valeur: '-', tag: 'À instruire',   tone: 'warn',    icon: Clock },
  { label: 'Demandes validées',    valeur: '-', tag: 'Ce mois',       tone: 'success', icon: CheckCircle2 },
  { label: 'Établissements actifs', valeur: '-', tag: 'Total',        tone: 'info',    icon: Building2 },
  { label: 'En correction',        valeur: '-', tag: 'En attente',    tone: 'danger',  icon: AlertTriangle },
]

const ESPACES = [
  { label: 'Demandes',        icon: FileText,   path: '/admin/demandes',      desc: 'Instruire les dossiers' },
  { label: 'Établissements',  icon: Building2,  path: '/admin/etablissements', desc: 'Gérer le réseau' },
  { label: 'Indicateurs',     icon: BarChart3,  path: '/admin/indicateurs',    desc: 'Tableaux de bord' },
  { label: 'Utilisateurs',    icon: Users,      path: '/admin/utilisateurs',   desc: 'Comptes & rôles' },
  { label: 'Rapports',        icon: TrendingUp, path: '/admin/rapports',       desc: 'Statistiques' },
  { label: 'Paramètres',      icon: Settings,   path: SECURITY_PATH,           desc: 'Configuration' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [navOuvert, setNavOuvert] = useState(false)

  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Super Admin'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="adm-shell">

      {/* ── Sidebar ── */}
      <aside className={`adm-nav ${navOuvert ? 'is-open' : ''}`}>
        <div className="adm-nav-head">
          <img src="/sigapei.png" alt={ENV.appName} className="adm-nav-logo" />
          <span className="adm-nav-appname">{ENV.appName}</span>
          <button className="adm-nav-close" onClick={() => setNavOuvert(false)} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        <nav className="adm-nav-body">
          {NAV_ITEMS.map((groupe) => (
            <div key={groupe.groupe} className="adm-nav-groupe">
              <p className="adm-nav-groupe-label">{groupe.groupe}</p>
              {groupe.items.map((item) => {
                const Icon = item.icon
                const actif = window.location.pathname === item.path
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`adm-nav-item ${actif ? 'is-active' : ''}`}
                    onClick={() => setNavOuvert(false)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="adm-nav-foot">
          <div className="adm-nav-user">
            <span className="adm-avatar">{initiales}</span>
            <div>
              <p className="adm-nav-user-name">{nom}</p>
              <p className="adm-nav-user-role">Super Administrateur</p>
            </div>
          </div>
          <ThemeToggle variant="pill" className="adm-theme-toggle" />
        </div>
      </aside>

      {/* Overlay mobile */}
      {navOuvert && <div className="adm-overlay" onClick={() => setNavOuvert(false)} />}

      {/* ── Contenu principal ── */}
      <div className="adm-main">

        {/* Topbar */}
        <header className="adm-topbar">
          <button className="adm-menu-btn" onClick={() => setNavOuvert(true)} aria-label="Ouvrir le menu">
            <Menu size={22} />
          </button>
          <h1 className="adm-topbar-title">Tableau de bord</h1>
          <div className="adm-topbar-actions">
            <button className="adm-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <ThemeToggle />
            <button
              className="adm-icon-btn adm-icon-btn--logout"
              onClick={() => logout('manual')}
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Corps */}
        <div className="adm-body">

          {/* Bannière de bienvenue */}
          <section className="adm-welcome">
            <div>
              <h2>Bienvenue, {nom.split(' ')[0]}</h2>
              <p>Voici votre vue d'ensemble SIGAPEI pour aujourd'hui.</p>
            </div>
            <Link to="/admin/demandes" className="adm-btn">
              Voir les demandes <ChevronRight size={16} />
            </Link>
          </section>

          {/* Cartes statistiques */}
          <section className="adm-stats">
            {STATS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className={`adm-stat adm-stat--${s.tone}`}>
                  <div className="adm-stat-icon"><Icon size={22} /></div>
                  <div className="adm-stat-body">
                    <p className="adm-stat-valeur">{s.valeur}</p>
                    <p className="adm-stat-label">{s.label}</p>
                  </div>
                  <span className="adm-stat-tag">{s.tag}</span>
                </div>
              )
            })}
          </section>

          {/* Espaces de travail */}
          <section className="adm-section">
            <h3 className="adm-section-title">
              <LayoutDashboard size={18} /> Mes espaces de travail
            </h3>
            <div className="adm-grid">
              {ESPACES.map((e) => {
                const Icon = e.icon
                return (
                  <Link key={e.label} to={e.path} className="adm-card">
                    <div className="adm-card-icon"><Icon size={28} /></div>
                    <p className="adm-card-label">{e.label}</p>
                    <p className="adm-card-desc">{e.desc}</p>
                    <span className="adm-card-arrow"><ChevronRight size={16} /></span>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Prérequis / info */}
          <section className="adm-prereq">
            <div className="adm-prereq-icon"><Settings size={20} /></div>
            <div>
              <strong>Plateforme en cours de déploiement</strong>
              <p>
                Certains modules sont encore en construction. Les demandes d'inscription sont
                disponibles dès maintenant dans <Link to="/admin/demandes">Espaces Métier → Demandes</Link>.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
