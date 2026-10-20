import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText,
  BarChart3, Settings, LogOut, Bell, Menu, X, Layers
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { withAuth } from '../../components/identite/RequireAuth'
import ThemeToggle from '../../components/commun/ThemeToggle'
import { ENV } from '../../config/commun/env'
import { ADMIN_DASHBOARD_PATH, COMPTE_PATH } from '../../config/identite/routes'
import { ADMIN_PATHS } from '../../config/etablissements/config'
import { SERVICE_PATHS } from '../../config/services/config'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './AdminLayout.css'

const NAV = [
  {
    groupe: 'VUE D\'ENSEMBLE',
    items: [
      { id: 'dashboard',      label: 'Tableau de bord',      icon: LayoutDashboard, path: ADMIN_DASHBOARD_PATH },
      { id: 'compte',         label: 'Mon profil',           icon: Users,           path: COMPTE_PATH },
    ],
  },
  {
    groupe: 'PILOTAGE',
    items: [
      { id: 'indicateurs',    label: 'Indicateurs',          icon: BarChart3,       path: '/admin/indicateurs' },
      { id: 'rapports',       label: 'Rapports statistiques',icon: FileText,        path: '/admin/rapports' },
    ],
  },
  {
    groupe: 'ESPACES MÉTIER',
    items: [
      { id: 'demandes',       label: 'Demandes',             icon: FileText,        path: ADMIN_PATHS.demandes },
      { id: 'etablissements', label: 'Établissements',       icon: Building2,       path: '/admin/etablissements' },
      { id: 'services',       label: 'Services',             icon: Layers,          path: SERVICE_PATHS.liste },
      { id: 'utilisateurs',   label: 'Utilisateurs',         icon: Users,           path: '/admin/utilisateurs' },
    ],
  },
  {
    groupe: 'ADMINISTRATION',
    items: [
      { id: 'parametres',     label: 'Sécurité & Compte',    icon: Settings,        path: COMPTE_PATH },
    ],
  },
]

/** Titre de la barre supérieure déduit de l'URL (l'entrée de menu la plus précise l'emporte). */
function titreDepuisRoute(pathname, defaut) {
  if (/^\/admin\/etablissements\/[^/]+\/services/.test(pathname)) return "Services d'un établissement"
  let meilleur = null
  NAV.forEach((g) => g.items.forEach((i) => {
    const correspond = pathname === i.path || pathname.startsWith(i.path + '/')
    if (correspond && (!meilleur || i.path.length > meilleur.path.length)) meilleur = i
  }))
  return meilleur?.label ?? defaut
}

function AdminLayoutInner({ pageTitle }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [navOuvert, setNavOuvert] = useState(false)

  const nom      = user?.nomComplet ?? user?.nom_complet ?? 'Super Admin'
  const initiales = nom.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // Titre dynamique : nom de la page active dans le nav, sinon pageTitle
  const titreActif = NAV.flatMap(g => g.items).find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))?.label ?? pageTitle
  usePageTitle(titreActif)

  const actif = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  function deconnexion() {
    logout('manual')
  }

  return (
    <div className="al-shell">

      {/* ══ Sidebar ══ */}
      <aside className={`al-nav ${navOuvert ? 'is-open' : ''}`} aria-label="Navigation principale">
        <div className="al-nav-head">
          <div className="al-nav-logo-wrap">
            <img src="/sigapei.png" alt={ENV.appName} className="al-nav-logo" />
          </div>
          <span className="al-nav-appname">{ENV.appName}</span>
          <button className="al-nav-close" onClick={() => setNavOuvert(false)} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <nav className="al-nav-body">
          {NAV.map(groupe => (
            <div key={groupe.groupe} className="al-nav-groupe">
              <p className="al-nav-groupe-label">{groupe.groupe}</p>
              {groupe.items.map(item => {
                const Icon = item.icon
                const isActive = actif(item.path)
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`al-nav-item${isActive ? ' is-active' : ''}`}
                    onClick={() => setNavOuvert(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="al-nav-foot">
          <div className="al-nav-user">
            <span className="al-avatar" aria-hidden="true">{initiales}</span>
            <div>
              <p className="al-nav-user-name">{nom}</p>
              <p className="al-nav-user-role">Super Administrateur</p>
            </div>
          </div>
          <ThemeToggle variant="pill" className="al-theme-toggle" />
        </div>
      </aside>

      {/* Overlay mobile */}
      {navOuvert && (
        <div
          className="al-overlay"
          onClick={() => setNavOuvert(false)}
          aria-hidden="true"
        />
      )}

      {/* ══ Contenu ══ */}
      <div className="al-main">

        {/* Topbar */}
        <header className="al-topbar">
          <button
            className="al-menu-btn"
            onClick={() => setNavOuvert(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={navOuvert}
          >
            <Menu size={22} />
          </button>
          <h1 className="al-topbar-title">{titreDepuisRoute(location.pathname, pageTitle)}</h1>
          <div className="al-topbar-actions">
            <button className="al-icon-btn" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <ThemeToggle />
            <button
              className="al-icon-btn al-icon-btn--logout"
              onClick={deconnexion}
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {/* Page content via Outlet */}
        <div className="al-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/** HOC - protège le layout et toutes ses routes enfants (rôle super_admin requis). */
const AdminLayoutProtected = withAuth(AdminLayoutInner, { roles: ['super_admin'] })

/** Wrapper avec prop pageTitle injectée depuis les routes */
export default function AdminLayout({ pageTitle = 'Administration' }) {
  return <AdminLayoutProtected pageTitle={pageTitle} />
}
