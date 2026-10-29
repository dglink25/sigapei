import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutGrid, User, Settings, LogOut, Menu, X, Bell,
  GraduationCap, Plus, Users, Shield, Layers,
} from 'lucide-react'
import { useAuth }            from '../../context/identite/AuthContext'
import ThemeToggle            from './ThemeToggle'
import NotificationBell       from './NotificationBell'
import { ENV }                from '../../config/commun/env'
import { roleCodeOf }         from '../../config/identite/routes'
import { lienEtablissement }  from '../../lib/etablissements/subdomain'
import { portailService }     from '../../services/identite/portail.service'
import useSlugEtablissement   from '../../hooks/etablissements/useSlugEtablissement'
import './PortailLayout.css'

const LIBELLES_ROLES = {
  administrateur:'Administrateur', enseignant:'Enseignant', personnel:'Personnel',
  apprenant:'Apprenant', parent:'Parent', etudiant:'Étudiant', eleve:'Élève',
}
const libelleRole = (code='') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g,' ').replace(/^./,(c)=>c.toUpperCase()) : '')

export default function PortailLayout() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const slug             = useSlugEtablissement()

  const [navOuvert,        setNavOuvert]        = useState(false)
  const [etablissementNom, setEtablissementNom] = useState(null)
  const [logoUrl,          setLogoUrl]          = useState(null)

  const nom       = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p)=>p[0]).join('').slice(0,2).toUpperCase()
  const role      = roleCodeOf(user)
  const estAdmin  = role === 'administrateur'

  const configBase = lienEtablissement(slug, '/configuration')
  const search     = new URLSearchParams(location.search)
  const estDansConfig = location.pathname.startsWith(configBase)
  const sectionURL    = search.get('section') ?? ''

  // Charger le nom et logo de l'établissement
  useEffect(() => {
    let cancel = false
    portailService.lire()
      .then((r) => {
        if (!cancel) {
          setEtablissementNom(r?.etablissement?.nom ?? null)
          setLogoUrl(r?.etablissement?.logoUrl ?? null)
        }
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [])

  const fermerNav = () => setNavOuvert(false)

  const titreTopbar = () => {
    if (estDansConfig) {
      const labels = {
        services:            'Services assignés',
        droits:              "Droits d'accès",
        etablissement:       'Infos établissement',
        'demandes-cycle':    'Cycles autorisés',
        utilisateurs:        'Utilisateurs',
        'demandes-role':     'Demande de rôle',
        'permissions-roles': 'Permissions des rôles',
      }
      return labels[sectionURL] ?? 'Configuration'
    }
    const fixes = [
      { to: lienEtablissement(slug, '/portail'), label: 'Portail' },
      { to: lienEtablissement(slug, '/compte'),  label: 'Mon profil' },
    ]
    return fixes.find((i) => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))?.label
      ?? etablissementNom
      ?? ENV.appName
  }

  return (
    <div className="pl-shell">
      <aside className={`pl-nav${navOuvert ? ' is-open' : ''}`} aria-label="Navigation principale">

        {/* Tête */}
        <div className="pl-nav-head">
          <Link to={lienEtablissement(slug, '/portail')} className="pl-nav-logo-wrap" onClick={fermerNav} aria-label="Retour au portail">
            {logoUrl
              ? <img src={logoUrl} alt={etablissementNom ?? ''} className="pl-nav-logo" style={{ objectFit:'contain', borderRadius:5 }} />
              : <img src="/sigapei.png" alt={ENV.appName} className="pl-nav-logo" />}
          </Link>
          <div className="pl-nav-etab">
            <span className="pl-nav-etab-nom">{etablissementNom ?? ENV.appName}</span>
          </div>
          <button className="pl-nav-close" onClick={fermerNav} aria-label="Fermer"><X size={18} /></button>
        </div>

        <nav className="pl-nav-body" aria-label="Menu principal">

          {/* ESPACE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">ESPACE</p>
            <Link
              to={lienEtablissement(slug, '/portail')}
              className={`pl-nav-item${location.pathname === lienEtablissement(slug, '/portail') ? ' is-active' : ''}`}
              onClick={fermerNav}
            >
              <LayoutGrid size={17} aria-hidden="true" /><span>Retour au Portail</span>
            </Link>
          </div>

          {/* ADMINISTRATION - visible uniquement pour l'admin */}
          {estAdmin && (
            <div className="pl-nav-groupe">
              <p className="pl-nav-groupe-label">ADMINISTRATION</p>

              {/* Configuration */}
              <Link
                to={configBase}
                className={`pl-nav-item${estDansConfig && !sectionURL ? ' is-active' : ''}`}
                onClick={fermerNav}
              >
                <Settings size={17} aria-hidden="true" /><span>Configuration</span>
              </Link>

              {/* Sous-liens Configuration (visibles quand on est dans la section) */}
              {estDansConfig && (
                <div className="pl-nav-submenu">
                  {[
                    { label: 'Services assignés',     section: 'services',          Icon: Layers },
                    { label: 'Cycles autorisés',      section: 'demandes-cycle',    Icon: GraduationCap },
                    { label: 'Utilisateurs',          section: 'utilisateurs',      Icon: Users },
                    { label: 'Permissions des rôles', section: 'permissions-roles', Icon: Shield },
                    { label: 'Demande de rôle',        section: 'demandes-role',     Icon: Plus },
                  ]
                    // Dédupliquer par section
                    .filter((item, i, arr) => arr.findIndex((x) => x.section === item.section) === i)
                    .map(({ label, section, Icon }) => {
                      const href  = `${configBase}?section=${section}`
                      const actif = sectionURL === section
                      return (
                        <Link key={section} to={href} className={`pl-nav-subitem${actif ? ' is-active' : ''}`} onClick={fermerNav}>
                          <Icon size={14} aria-hidden="true" /><span>{label}</span>
                        </Link>
                      )
                    })}
                </div>
              )}

              {/* Scolarité - lien vers le module dédié (ouvre son propre layout) */}
              <Link
                to={lienEtablissement(slug, '/scolarite')}
                className="pl-nav-item"
                onClick={fermerNav}
              >
                <GraduationCap size={17} aria-hidden="true" /><span>Scolarité</span>
              </Link>
            </div>
          )}

          {/* MON COMPTE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">MON COMPTE</p>
            <Link
              to={lienEtablissement(slug, '/compte')}
              className={`pl-nav-item${location.pathname === lienEtablissement(slug, '/compte') ? ' is-active' : ''}`}
              onClick={fermerNav}
            >
              <User size={17} aria-hidden="true" /><span>Mon profil</span>
            </Link>
          </div>

          {/* SESSION */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">SESSION</p>
            <button type="button" className="pl-nav-item is-logout" onClick={() => { fermerNav(); logout('manual') }}>
              <LogOut size={17} aria-hidden="true" /><span>Déconnexion</span>
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

      {navOuvert && <div className="pl-overlay" onClick={fermerNav} aria-hidden="true" />}

      <div className="pl-main">
        <header className="pl-topbar">
          <div className="pl-topbar-left">
            <button className="pl-menu-btn" onClick={() => setNavOuvert(true)} aria-label="Ouvrir le menu" aria-expanded={navOuvert}>
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
              <NotificationBell className="pl-icon-btn" />
              <ThemeToggle className="pl-icon-btn" />
              <button type="button" className="pl-icon-btn pl-icon-btn--logout" onClick={() => logout('manual')} aria-label="Déconnexion">
                <LogOut size={19} />
              </button>
            </div>
          </div>
        </header>
        <div className="pl-content"><Outlet /></div>
      </div>
    </div>
  )
}
