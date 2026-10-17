import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutGrid, User, Settings, LogOut, Menu, X, Bell } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import ThemeToggle from './ThemeToggle'
import { ENV } from '../../config/commun/env'
import { roleCodeOf } from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import './PortailLayout.css'

const LIBELLES_ROLES = {
  administrateur: 'Administrateur',
  enseignant: 'Enseignant',
  personnel: 'Personnel',
  apprenant: 'Apprenant',
  parent: 'Parent',
  etudiant: 'Étudiant',
  eleve: 'Élève',
}
const libelleRole = (code = '') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '')

export default function PortailLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const slug = useSlugEtablissement()
  const [navOuvert, setNavOuvert] = useState(false)
  const [etablissementNom, setEtablissementNom] = useState(null)

  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => { if (!annule) setEtablissementNom(r?.etablissement?.nom ?? null) })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const role = roleCodeOf(user)
  const estAdmin = role === 'administrateur'

  const NAV = [
    {
      groupe: 'ESPACE',
      items: [
        { id: 'portail', label: 'Retour au Portail', icon: LayoutGrid, to: lienEtablissement(slug, '/portail') },
      ],
    },
    ...(estAdmin
      ? [{
          groupe: 'ADMINISTRATION',
          items: [
            { id: 'configuration', label: 'Configuration', icon: Settings, to: lienEtablissement(slug, '/configuration') },
          ],
        }]
      : []),
    {
      groupe: 'MON COMPTE',
      items: [
        { id: 'profil', label: 'Mon profil', icon: User, to: lienEtablissement(slug, '/compte') },
      ],
    },
  ]

  const actif = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  const itemActif = NAV.flatMap((g) => g.items).find((i) => actif(i.to))
  const titre = itemActif?.label ?? etablissementNom ?? ENV.appName

  return (
    <div className="pl-shell">

      {/* ══ Sidebar ══ */}
      <aside className={`pl-nav${navOuvert ? ' is-open' : ''}`} aria-label="Navigation principale">
        <div className="pl-nav-head">
          <Link
            to={lienEtablissement(slug, '/portail')}
            className="pl-nav-logo-wrap"
            onClick={() => setNavOuvert(false)}
            aria-label="Retour au portail"
          >
            <img src="/sigapei.png" alt={ENV.appName} className="pl-nav-logo" />
          </Link>
          <div className="pl-nav-etab">
            <span className="pl-nav-etab-nom">{etablissementNom ?? ENV.appName}</span>
          </div>
          <button className="pl-nav-close" onClick={() => setNavOuvert(false)} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        <nav className="pl-nav-body" aria-label="Menu principal">
          {NAV.map((groupe) => (
            <div key={groupe.groupe} className="pl-nav-groupe">
              <p className="pl-nav-groupe-label">{groupe.groupe}</p>
              {groupe.items.map((item) => {
                const Icon = item.icon
                const isActive = actif(item.to)
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`pl-nav-item${isActive ? ' is-active' : ''}`}
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

          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">SESSION</p>
            <button
              type="button"
              className="pl-nav-item is-logout"
              onClick={() => { setNavOuvert(false); logout('manual') }}
            >
              <LogOut size={17} aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        <div className="pl-nav-foot">
          <div className="pl-nav-user">
            <span className="pl-avatar" aria-hidden="true">{initiales}</span>
            <div>
              <p className="pl-nav-user-name">{nom}</p>
              <p className="pl-nav-user-role">{libelleRole(role)}</p>
            </div>
          </div>
          <ThemeToggle variant="pill" />
        </div>
      </aside>

      {/* Overlay mobile */}
      {navOuvert && (
        <div className="pl-overlay" onClick={() => setNavOuvert(false)} aria-hidden="true" />
      )}

      {/* ══ Contenu ══ */}
      <div className="pl-main">

        {/* Topbar */}
        <header className="pl-topbar">
          {/* Zone gauche : Titre + Bouton menu (mobile) */}
          <div className="pl-topbar-left">
            <button
              className="pl-menu-btn"
              onClick={() => setNavOuvert(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={navOuvert}
            >
              <Menu size={22} />
            </button>
            <h1 className="pl-topbar-title">{titre}</h1>
          </div>

          {/* Zone droite : Profil + Icônes */}
          <div className="pl-topbar-right">
            
            {/* Profil cliquable menant vers /compte */}
            <Link to={lienEtablissement(slug, '/compte')} className="pl-topbar-user">
              <span className="pl-avatar pl-avatar--sm" aria-hidden="true">{initiales}</span>              
            </Link>

            <div className="pl-topbar-sep" aria-hidden="true" />

            <div className="pl-topbar-actions">
              <button className="pl-icon-btn" aria-label="Notifications" title="Notifications">
                <Bell size={19} />
              </button>
              <ThemeToggle className="pl-icon-btn" />
              <button
                type="button"
                className="pl-icon-btn pl-icon-btn--logout"
                onClick={() => logout('manual')}
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut size={19} />
              </button>
            </div>
          </div>
        </header>

        <div className="pl-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}