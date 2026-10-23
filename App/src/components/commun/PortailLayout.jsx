import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutGrid, User, Settings, LogOut, Menu, X, Bell,
  ChevronDown, CalendarDays, School, LayoutList,
  Layers, GitBranch, Users, BookOpen,
} from 'lucide-react'
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

/** Sous-liens du menu Configuration */
const CONFIG_ITEMS = [
  { id: 'vue-ensemble',  label: "Vue d'ensemble",         Icon: LayoutGrid,   section: '' },
  { id: 'annees',        label: 'Années académiques',     Icon: CalendarDays, section: 'annees' },
  { id: 'cycles',        label: 'Cycles actifs',          Icon: School,       section: 'cycles' },
  { id: 'subdivisions',  label: 'Groupes & départements', Icon: LayoutList,   section: 'subdivisions' },
  { id: 'niveaux',       label: 'Classes & niveaux',      Icon: Layers,       section: 'niveaux' },
  { id: 'series',        label: 'Séries & filières',      Icon: GitBranch,    section: 'series' },
  { id: 'cohortes',      label: 'Options & cohortes',     Icon: Users,        section: 'cohortes' },
  { id: 'matieres',      label: 'Matières & coefficients',Icon: BookOpen,     section: 'matieres' },
  { id: 'droits',        label: "Droits d'accès",         Icon: Settings,     section: 'droits' },
  { id: 'etablissement', label: 'Infos établissement',    Icon: Settings,     section: 'etablissement' },
]

export default function PortailLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const slug = useSlugEtablissement()
  const [navOuvert,      setNavOuvert]      = useState(false)
  const [configOuvert,   setConfigOuvert]   = useState(false)
  const [etablissementNom, setEtablissementNom] = useState(null)
  const [logoUrl,        setLogoUrl]        = useState(null)

  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => {
        if (!annule) {
          setEtablissementNom(r?.etablissement?.nom ?? null)
          setLogoUrl(r?.etablissement?.logoUrl ?? null)
        }
      })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  const nom      = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const role     = roleCodeOf(user)
  const estAdmin = role === 'administrateur'

  const configBase    = lienEtablissement(slug, '/configuration')
  const estDansConfig = location.pathname.startsWith(configBase)

  // Ouvre automatiquement le sous-menu quand on entre dans la config
  useEffect(() => {
    if (estDansConfig) setConfigOuvert(true)
  }, [estDansConfig])

  const sectionActive = () => new URLSearchParams(location.search).get('section') ?? ''

  const actif = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const titreTopbar = () => {
    if (estDansConfig) {
      const sec  = sectionActive()
      const item = CONFIG_ITEMS.find((i) => i.section === sec)
      return item ? `Configuration · ${item.label}` : 'Configuration'
    }
    const fixes = [
      { to: lienEtablissement(slug, '/portail'), label: 'Portail' },
      { to: lienEtablissement(slug, '/compte'),  label: 'Mon profil' },
    ]
    return fixes.find((i) => actif(i.to))?.label ?? etablissementNom ?? ENV.appName
  }

  const fermerNav = () => setNavOuvert(false)

  return (
    <div className="pl-shell">

      {/* ══ Sidebar unique ══ */}
      <aside className={`pl-nav${navOuvert ? ' is-open' : ''}`} aria-label="Navigation principale">

        {/* Tête : logo + nom établissement */}
        <div className="pl-nav-head">
          <Link
            to={lienEtablissement(slug, '/portail')}
            className="pl-nav-logo-wrap"
            onClick={fermerNav}
            aria-label="Retour au portail"
          >
            {logoUrl
              ? <img src={logoUrl} alt={etablissementNom ?? ''} className="pl-nav-logo" style={{ objectFit: 'contain', borderRadius: 5 }} />
              : <img src="/sigapei.png" alt={ENV.appName} className="pl-nav-logo" />
            }
          </Link>
          <div className="pl-nav-etab">
            <span className="pl-nav-etab-nom">{etablissementNom ?? ENV.appName}</span>
          </div>
          <button className="pl-nav-close" onClick={fermerNav} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        {/* Corps de navigation */}
        <nav className="pl-nav-body" aria-label="Menu principal">

          {/* ESPACE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">ESPACE</p>
            <Link
              to={lienEtablissement(slug, '/portail')}
              className={`pl-nav-item${actif(lienEtablissement(slug, '/portail')) && !estDansConfig ? ' is-active' : ''}`}
              onClick={fermerNav}
            >
              <LayoutGrid size={17} aria-hidden="true" />
              <span>Retour au Portail</span>
            </Link>
          </div>

          {/* ADMINISTRATION - admin uniquement */}
          {estAdmin && (
            <div className="pl-nav-groupe">
              <p className="pl-nav-groupe-label">ADMINISTRATION</p>

              {/* Bouton Configuration avec flèche déroulante */}
              <button
                type="button"
                className={`pl-nav-item pl-nav-item--parent${estDansConfig ? ' is-active' : ''}`}
                onClick={() => setConfigOuvert((o) => !o)}
                aria-expanded={configOuvert}
              >
                <Settings size={17} aria-hidden="true" />
                <span>Configuration</span>
                <ChevronDown
                  size={15}
                  className={`pl-nav-chevron${configOuvert ? ' is-open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* Sous-menu déroulant */}
              {configOuvert && (
                <div className="pl-nav-submenu" role="group" aria-label="Sous-menu configuration">
                  {CONFIG_ITEMS.map(({ id, label, Icon, section }) => {
                    const href    = section ? `${configBase}?section=${section}` : configBase
                    const estActif = estDansConfig && sectionActive() === section
                    return (
                      <Link
                        key={id}
                        to={href}
                        className={`pl-nav-subitem${estActif ? ' is-active' : ''}`}
                        onClick={fermerNav}
                        aria-current={estActif ? 'page' : undefined}
                      >
                        <Icon size={14} aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* MON COMPTE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">MON COMPTE</p>
            <Link
              to={lienEtablissement(slug, '/compte')}
              className={`pl-nav-item${actif(lienEtablissement(slug, '/compte')) ? ' is-active' : ''}`}
              onClick={fermerNav}
            >
              <User size={17} aria-hidden="true" />
              <span>Mon profil</span>
            </Link>
          </div>

          {/* SESSION */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">SESSION</p>
            <button
              type="button"
              className="pl-nav-item is-logout"
              onClick={() => { fermerNav(); logout('manual') }}
            >
              <LogOut size={17} aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        {/* Pied : avatar + thème */}
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
        <div className="pl-overlay" onClick={fermerNav} aria-hidden="true" />
      )}

      {/* ══ Contenu principal ══ */}
      <div className="pl-main">
        <header className="pl-topbar">
          <div className="pl-topbar-left">
            <button
              className="pl-menu-btn"
              onClick={() => setNavOuvert(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={navOuvert}
            >
              <Menu size={22} />
            </button>
            <h1 className="pl-topbar-title">{titreTopbar()}</h1>
          </div>

          <div className="pl-topbar-right">
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
