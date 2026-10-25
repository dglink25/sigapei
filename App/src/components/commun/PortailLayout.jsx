import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutGrid, User, Settings, LogOut, Menu, X, Bell,
  ChevronDown, CalendarDays, School, BookOpen, GraduationCap, Building2, Plus,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import ThemeToggle from './ThemeToggle'
import { ENV } from '../../config/commun/env'
import { roleCodeOf } from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import './PortailLayout.css'

const LIBELLES_ROLES = {
  administrateur: 'Administrateur', enseignant: 'Enseignant',
  personnel: 'Personnel', apprenant: 'Apprenant',
  parent: 'Parent', etudiant: 'Étudiant', eleve: 'Élève',
}
const libelleRole = (code = '') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '')

const CYCLE_LABELS = {
  maternelle: 'Maternelle', primaire: 'Primaire',
  secondaire: 'Secondaire', universitaire: 'Université',
}

const CYCLE_ICONES = {
  maternelle:    School,
  primaire:      BookOpen,
  secondaire:    GraduationCap,
  universitaire: Building2,
}

// Liens fixes de configuration (hors cycles)
const CFG_LIENS_FIXES = [
  { id: 'vue-ensemble',  label: "Vue d'ensemble",       section: '',               Icon: LayoutGrid },
  { id: 'annees',        label: 'Années académiques',   section: 'annees',         Icon: CalendarDays },
  { id: 'demandes-cycle',label: 'Demande de cycle',     section: 'demandes-cycle', Icon: Plus },
]

// Onglets par cycle (doit correspondre à PanneauCyclePage)
const ONGLETS_CYCLE = {
  maternelle:    [{ id:'groupes', label:'Groupes' }, { id:'niveaux', label:'Niveaux' }, { id:'classes', label:'Classes' }, { id:'matieres', label:'Matières' }],
  primaire:      [{ id:'groupes', label:'Groupes' }, { id:'niveaux', label:'Niveaux' }, { id:'classes', label:'Classes' }, { id:'matieres', label:'Matières' }],
  secondaire:    [{ id:'groupes', label:'Sections' }, { id:'niveaux', label:'Niveaux' }, { id:'classes', label:'Classes' }, { id:'series', label:'Séries' }, { id:'matieres', label:'Matières' }],
  universitaire: [{ id:'groupes', label:'Départements' }, { id:'filieres', label:'Filières' }, { id:'niveaux', label:'Niveaux' }, { id:'cohortes', label:'Cohortes' }, { id:'matieres', label:'Matières' }],
}

export default function PortailLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const slug = useSlugEtablissement()
  const [navOuvert,        setNavOuvert]        = useState(false)
  const [configOuvert,     setConfigOuvert]     = useState(false)
  const [cycleOuvert,      setCycleOuvert]      = useState(null) // cycle slug ouvert
  const [etablissementNom, setEtablissementNom] = useState(null)
  const [logoUrl,          setLogoUrl]          = useState(null)
  const [cyclesActifs,     setCyclesActifs]      = useState([])

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

  // Charger l'année active puis les cycles
  useEffect(() => {
    let annule = false
    anneesService.lister()
      .then((r) => {
        if (annule) return
        const liste = r?.data ?? r ?? []
        const active = liste.find((a) => a.statut === 'en_cours') ?? liste[0]
        if (!active) return
        cyclesService.lister(active.uuid)
          .then((rc) => {
            if (!annule) setCyclesActifs((rc?.data ?? rc ?? []).filter((c) => c.actif))
          })
          .catch(() => {})
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
  const cycleActifURL = new URLSearchParams(location.search).get('cycle') ?? ''

  useEffect(() => {
    if (estDansConfig) setConfigOuvert(true)
    if (cycleActifURL) setCycleOuvert(cycleActifURL)
  }, [estDansConfig, cycleActifURL])

  const sectionActive = () => new URLSearchParams(location.search).get('section') ?? ''

  const actif = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const titreTopbar = () => {
    if (estDansConfig) {
      if (cycleActifURL) return `Configuration · ${CYCLE_LABELS[cycleActifURL] ?? cycleActifURL}`
      const sec = sectionActive()
      if (sec === 'annees') return 'Configuration · Années académiques'
      if (sec === 'droits') return "Configuration · Droits d'accès"
      if (sec === 'etablissement') return 'Configuration · Infos établissement'
      return 'Configuration'
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

                  {/* Liens fixes : Vue d'ensemble + Années */}
                  {CFG_LIENS_FIXES.map(({ id, label, section, Icon }) => {
                    const href     = section ? `${configBase}?section=${section}` : configBase
                    const estActif = estDansConfig && !cycleActifURL && sectionActive() === section
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

                  {/* Cycles actifs */}
                  {cyclesActifs.length > 0 && (
                    <p style={{ padding:'8px 14px 3px', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase', color:'rgba(255,246,221,0.32)', margin:0 }}>
                      Par cycle
                    </p>
                  )}

                  {cyclesActifs.map((c) => {
                    const estCycleActif = estDansConfig && cycleActifURL === c.cycle
                    const ouvert        = cycleOuvert === c.cycle
                    const CycleIcon     = CYCLE_ICONES[c.cycle] ?? School
                    return (
                      <div key={c.uuid}>
                        <button
                          type="button"
                          className={`pl-nav-subitem pl-nav-subitem--parent${estCycleActif ? ' is-active' : ''}`}
                          onClick={() => setCycleOuvert((prev) => prev === c.cycle ? null : c.cycle)}
                          aria-expanded={ouvert}
                        >
                          <CycleIcon size={13} aria-hidden="true" />
                          <span>{CYCLE_LABELS[c.cycle]}</span>
                          <ChevronDown size={12} className={`pl-nav-chevron${ouvert ? ' is-open' : ''}`} style={{ marginLeft:'auto' }} aria-hidden="true" />
                        </button>

                        {ouvert && (
                          <div className="pl-nav-submenu-nested">
                            {ONGLETS_CYCLE[c.cycle]?.map(({ id, label }) => {
                              const href     = `${configBase}?cycle=${c.cycle}&onglet=${id}`
                              const estActif = estCycleActif && new URLSearchParams(location.search).get('onglet') === id
                              return (
                                <Link
                                  key={id}
                                  to={href}
                                  className={`pl-nav-deepitem${estActif ? ' is-active' : ''}`}
                                  onClick={fermerNav}
                                  aria-current={estActif ? 'page' : undefined}
                                >
                                  {label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
