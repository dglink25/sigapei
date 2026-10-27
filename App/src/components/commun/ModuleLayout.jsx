import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { useAuth }           from '../../context/identite/AuthContext'
import { roleCodeOf }        from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import ThemeToggle           from './ThemeToggle'
import { ENV }               from '../../config/commun/env'
import { portailService }    from '../../services/identite/portail.service'
import useSlugEtablissement  from '../../hooks/etablissements/useSlugEtablissement'
import './ModuleLayout.css'

const LIBELLES_ROLES = {
  administrateur:'Administrateur', enseignant:'Enseignant', personnel:'Personnel',
  apprenant:'Apprenant', parent:'Parent', etudiant:'Étudiant', eleve:'Élève',
}
const libelleRole = (code='') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g,' ').replace(/^./,(c)=>c.toUpperCase()) : '')

export default function ModuleLayout({ titre, icone: ModuleIcone, couleur, nav = [], children }) {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const slug             = useSlugEtablissement()
  const [navOuvert, setNavOuvert] = useState(false)

  // ── Identité établissement : chargée via portailService.lire() ──
  // (comme dans PortailLayout - le user du contexte ne contient pas ces infos)
  const [etablissementNom, setEtablissementNom] = useState(null)
  const [logoUrl,          setLogoUrl]          = useState(null)

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

  const nom       = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const role      = roleCodeOf(user)
  const portailUrl = lienEtablissement(slug, '/portail')

  const fermerNav = () => setNavOuvert(false)
  const accent    = couleur ?? 'var(--pl-green)'

  return (
    <div className="ml-shell">
      {/* ── SIDEBAR ── */}
      <aside
        className={`ml-nav${navOuvert ? ' is-open' : ''}`}
        aria-label={`Navigation ${titre}`}
        style={{ '--ml-accent': accent }}
      >
        {/* Tête */}
        <div className="pl-nav-head">
          <Link
            to={portailUrl}
            className="pl-nav-logo-wrap"
            onClick={fermerNav}
            aria-label="Retour au portail"
          >
            {logoUrl
              ? <img src={logoUrl} alt={etablissementNom ?? ''} className="pl-nav-logo" style={{ objectFit:'contain', borderRadius:5 }} />
              : <img src="/sigapei.png" alt={ENV.appName} className="pl-nav-logo" />}
          </Link>
          <div className="pl-nav-etab">
            <span className="pl-nav-etab-nom">{etablissementNom ?? ENV.appName}</span>
            <button className="pl-nav-close" onClick={fermerNav} aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <nav className="ml-nav-body" aria-label={`Menu ${titre}`}>

          {/* Lien retour portail toujours en tête */}
          <div className="ml-nav-groupe">
            <p className="ml-nav-groupe-label">ESPACE</p>
            <Link to={portailUrl} className="ml-nav-item" onClick={fermerNav}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Retour au Portail</span>
            </Link>
          </div>

          {/* Groupes de navigation du module */}
          {nav.map(({ groupe, items }) => (
            <div key={groupe} className="ml-nav-groupe">
              <p className="ml-nav-groupe-label">{groupe}</p>
              {items.map((item) => {
                const estActif = item.actif ?? (location.pathname === item.href || (item.href && location.pathname.startsWith(item.href)))
                return (
                  <NavItem key={item.href ?? item.label} item={item} actif={estActif} onClose={fermerNav} location={location} />
                )
              })}
            </div>
          ))}

          {/* Mon compte */}
          <div className="ml-nav-groupe">
            <p className="ml-nav-groupe-label">MON COMPTE</p>
            <Link
              to={lienEtablissement(slug, '/compte')}
              className={`ml-nav-item${location.pathname === lienEtablissement(slug, '/compte') ? ' is-active' : ''}`}
              onClick={fermerNav}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Mon profil</span>
            </Link>
          </div>

          {/* Session */}
          <div className="ml-nav-groupe">
            <p className="ml-nav-groupe-label">SESSION</p>
            <button type="button" className="ml-nav-item is-logout" onClick={() => { fermerNav(); logout('manual') }}>
              <LogOut size={17} aria-hidden="true" /><span>Déconnexion</span>
            </button>
          </div>
        </nav>

        {/* Pied */}
        <div className="ml-nav-foot">
          <div className="ml-nav-user">
            <span className="ml-avatar" aria-hidden="true">{initiales}</span>
            <div>
              <p className="ml-nav-user-name">{nom}</p>
              <p className="ml-nav-user-role">{libelleRole(role)}</p>
            </div>
          </div>
          <ThemeToggle variant="pill" />
        </div>
      </aside>

      {navOuvert && <div className="ml-overlay" onClick={fermerNav} aria-hidden="true" />}

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="ml-main">
        <header className="ml-topbar" style={{ '--ml-accent': accent }}>
          <div className="ml-topbar-left">
            <button className="ml-menu-btn" onClick={() => setNavOuvert(true)} aria-label="Ouvrir le menu" aria-expanded={navOuvert}>
              <Menu size={22} />
            </button>
            <h1 className="ml-topbar-title" style={{ color: accent }}>{titre}</h1>
          </div>
          <div className="ml-topbar-right">
            <Link to={lienEtablissement(slug, '/compte')} className="ml-topbar-user">
              <span className="ml-avatar ml-avatar--sm" aria-hidden="true">{initiales}</span>
              <div className="ml-topbar-user-texte">
                <span className="ml-topbar-user-nom">{nom}</span>
                <span className="ml-topbar-user-role">{libelleRole(role)}</span>
              </div>
            </Link>
            <div className="ml-topbar-sep" aria-hidden="true" />
            <div className="ml-topbar-actions">
              <button className="ml-icon-btn" aria-label="Notifications"><Bell size={19} /></button>
              <ThemeToggle className="ml-icon-btn" />
              <button type="button" className="ml-icon-btn ml-icon-btn--logout" onClick={() => logout('manual')} aria-label="Déconnexion">
                <LogOut size={19} />
              </button>
            </div>
          </div>
        </header>
        <div className="ml-content">{children}</div>
      </div>
    </div>
  )
}

/* ── Élément de navigation récursif ── */
function NavItem({ item, actif, onClose, location }) {
  const [deplie, setDeplie] = useState(() => {
    if (!item.enfants) return false
    return item.enfants.some((e) => e.href && location.pathname.includes(e.href.split('?')[0]))
  })

  if (item.enfants?.length) {
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link
            to={item.href}
            className={`ml-nav-item${actif ? ' is-active' : ''}`}
            style={{ flex:1 }}
            onClick={onClose}
          >
            {item.Icon && <item.Icon size={17} aria-hidden="true" />}
            <span>{item.label}</span>
          </Link>
          <button
            type="button"
            aria-label={deplie ? 'Réduire' : 'Développer'}
            aria-expanded={deplie}
            onClick={() => setDeplie((p) => !p)}
            style={{ background:'none', border:0, cursor:'pointer', padding:'8px 12px', color:'rgba(255,246,221,0.45)', display:'flex', alignItems:'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
              style={{ transform: deplie ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        {deplie && (
          <div className="ml-nav-submenu">
            {item.enfants.map((enfant) => {
              const queryEnfant = enfant.href?.split('?')[1] ?? null
              const eActif = enfant.actif ?? (queryEnfant ? location.search.includes(queryEnfant) : false)
              return (
                <Link
                  key={enfant.href ?? enfant.label}
                  to={enfant.href}
                  className={`ml-nav-subitem${eActif ? ' is-active' : ''}`}
                  onClick={onClose}
                >
                  {enfant.Icon && <enfant.Icon size={14} aria-hidden="true" />}
                  <span>{enfant.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.href}
      className={`ml-nav-item${actif ? ' is-active' : ''}`}
      onClick={onClose}
    >
      {item.Icon && <item.Icon size={17} aria-hidden="true" />}
      <span>{item.label}</span>
    </Link>
  )
}