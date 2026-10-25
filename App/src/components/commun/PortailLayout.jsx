import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutGrid, User, Settings, LogOut, Menu, X, Bell,
  CalendarDays, School, BookOpen, GraduationCap, Building2, Plus,
  ChevronRight, ChevronDown,
} from 'lucide-react'
import { useAuth }            from '../../context/identite/AuthContext'
import ThemeToggle            from './ThemeToggle'
import { ENV }                from '../../config/commun/env'
import { roleCodeOf }         from '../../config/identite/routes'
import { lienEtablissement }  from '../../lib/etablissements/subdomain'
import { portailService }     from '../../services/identite/portail.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import useSlugEtablissement   from '../../hooks/etablissements/useSlugEtablissement'
import './PortailLayout.css'

/* ── Constantes ─────────────────────────────────────────────────── */

const LIBELLES_ROLES = {
  administrateur:'Administrateur', enseignant:'Enseignant', personnel:'Personnel',
  apprenant:'Apprenant', parent:'Parent', etudiant:'Étudiant', eleve:'Élève',
}
const libelleRole = (code='') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g,' ').replace(/^./,(c)=>c.toUpperCase()) : '')

const CYCLE_LABELS = { maternelle:'Maternelle', primaire:'Primaire', secondaire:'Secondaire', universitaire:'Université' }
const CYCLE_ICONES = { maternelle:School, primaire:BookOpen, secondaire:GraduationCap, universitaire:Building2 }

// Premier onglet de chaque cycle (destination du clic direct)
const CYCLE_ONGLET_DEFAUT = {
  maternelle:'groupes', primaire:'groupes', secondaire:'groupes', universitaire:'groupes',
}

// Tous les onglets par cycle
const ONGLETS_CYCLE = {
  maternelle:    [{id:'groupes',label:'Groupes'},{id:'niveaux',label:'Niveaux'},{id:'classes',label:'Classes'},{id:'matieres',label:'Matières'}],
  primaire:      [{id:'groupes',label:'Groupes'},{id:'niveaux',label:'Niveaux'},{id:'classes',label:'Classes'},{id:'matieres',label:'Matières'}],
  secondaire:    [{id:'groupes',label:'Sections'},{id:'niveaux',label:'Niveaux'},{id:'classes',label:'Classes'},{id:'series',label:'Séries'},{id:'matieres',label:'Matières'}],
  universitaire: [{id:'groupes',label:'Départements'},{id:'filieres',label:'Filières'},{id:'niveaux',label:'Niveaux'},{id:'cohortes',label:'Cohortes'},{id:'matieres',label:'Matières'}],
}

/* ── Composant ──────────────────────────────────────────────────── */

export default function PortailLayout() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const slug             = useSlugEtablissement()

  const [navOuvert,        setNavOuvert]        = useState(false)
  const [etablissementNom, setEtablissementNom] = useState(null)
  const [logoUrl,          setLogoUrl]          = useState(null)
  const [cyclesActifs,     setCyclesActifs]      = useState([])
  // Quel cycle est déplié dans la sidebar (null = aucun)
  const [cycleDeplie,      setCycleDeplie]       = useState(null)

  const nom       = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p)=>p[0]).join('').slice(0,2).toUpperCase()
  const role      = roleCodeOf(user)
  const estAdmin  = role === 'administrateur'

  const configBase    = lienEtablissement(slug, '/configuration')
  const search        = new URLSearchParams(location.search)
  const estDansConfig = location.pathname.startsWith(configBase)
  const cycleURL      = search.get('cycle') ?? ''
  const sectionURL    = search.get('section') ?? ''
  const ongletURL     = search.get('onglet') ?? ''

  // Charger l'établissement
  useEffect(()=>{
    let cancel=false
    portailService.lire().then((r)=>{ if(!cancel){ setEtablissementNom(r?.etablissement?.nom??null); setLogoUrl(r?.etablissement?.logoUrl??null) } }).catch(()=>{})
    return ()=>{ cancel=true }
  },[])

  // Charger les cycles actifs dès que l'admin entre dans la config
  // On recharge à chaque fois qu'on entre dans la config pour être à jour
  useEffect(()=>{
    if (!estAdmin) return
    let cancel=false
    anneesService.lister()
      .then((r)=>{
        if (cancel) return
        const liste = r?.data ?? r ?? []
        const active = liste.find((a)=>a.statut==='en_cours') ?? liste[0]
        if (!active) return
        cyclesService.lister(active.uuid).then((rc)=>{
          if (!cancel) setCyclesActifs((rc?.data??rc??[]).filter((c)=>c.actif))
        }).catch(()=>{})
      }).catch(()=>{})
    return ()=>{ cancel=true }
  },[estAdmin])

  // Déplier automatiquement le cycle actif dans la sidebar
  useEffect(()=>{
    if (cycleURL) setCycleDeplie(cycleURL)
  },[cycleURL])

  const fermerNav = () => setNavOuvert(false)

  const titreTopbar = () => {
    if (estDansConfig) {
      if (cycleURL)                    return `${CYCLE_LABELS[cycleURL] ?? cycleURL}`
      if (sectionURL==='annees')       return 'Années académiques'
      if (sectionURL==='droits')       return "Droits d'accès"
      if (sectionURL==='etablissement')return 'Infos établissement'
      if (sectionURL==='demandes-cycle')return 'Demande de cycle'
      return 'Configuration'
    }
    const fixes = [
      { to:lienEtablissement(slug,'/portail'), label:'Portail' },
      { to:lienEtablissement(slug,'/compte'),  label:'Mon profil' },
    ]
    return fixes.find((i)=>location.pathname===i.to||location.pathname.startsWith(i.to+'/'))?.label ?? etablissementNom ?? ENV.appName
  }

  return (
    <div className="pl-shell">
      <aside className={`pl-nav${navOuvert?' is-open':''}`} aria-label="Navigation principale">

        {/* Tête */}
        <div className="pl-nav-head">
          <Link to={lienEtablissement(slug,'/portail')} className="pl-nav-logo-wrap" onClick={fermerNav} aria-label="Retour au portail">
            {logoUrl
              ? <img src={logoUrl} alt={etablissementNom??''} className="pl-nav-logo" style={{objectFit:'contain',borderRadius:5}} />
              : <img src="/sigapei.png" alt={ENV.appName} className="pl-nav-logo" />}
          </Link>
          <div className="pl-nav-etab">
            <span className="pl-nav-etab-nom">{etablissementNom ?? ENV.appName}</span>
          </div>
          <button className="pl-nav-close" onClick={fermerNav} aria-label="Fermer"><X size={18}/></button>
        </div>

        <nav className="pl-nav-body" aria-label="Menu principal">

          {/* ESPACE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">ESPACE</p>
            <Link
              to={lienEtablissement(slug,'/portail')}
              className={`pl-nav-item${location.pathname===lienEtablissement(slug,'/portail')&&!estDansConfig?' is-active':''}`}
              onClick={fermerNav}
            >
              <LayoutGrid size={17} aria-hidden="true"/><span>Retour au Portail</span>
            </Link>
          </div>

          {/* ADMINISTRATION */}
          {estAdmin && (
            <div className="pl-nav-groupe">
              <p className="pl-nav-groupe-label">ADMINISTRATION</p>

              {/* Configuration - lien direct vers vue d'ensemble */}
              <Link
                to={configBase}
                className={`pl-nav-item${estDansConfig&&!cycleURL&&!sectionURL?' is-active':''}`}
                onClick={fermerNav}
              >
                <Settings size={17} aria-hidden="true"/><span>Configuration</span>
              </Link>

              {/* Sous-liens toujours visibles quand on est dans la config */}
              {estDansConfig && (
                <div className="pl-nav-submenu">

                  {/* Liens fixes */}
                  {[
                    { label:'Années académiques', section:'annees',          Icon:CalendarDays },
                    { label:'Demande de cycle',   section:'demandes-cycle',  Icon:Plus },
                  ].map(({label,section,Icon})=>{
                    const href    = `${configBase}?section=${section}`
                    const actif   = !cycleURL && sectionURL===section
                    return (
                      <Link key={section} to={href} className={`pl-nav-subitem${actif?' is-active':''}`} onClick={fermerNav}>
                        <Icon size={14} aria-hidden="true"/><span>{label}</span>
                      </Link>
                    )
                  })}

                  {/* Cycles - affichés directement, toujours visibles */}
                  {cyclesActifs.length > 0 && (
                    <p style={{padding:'8px 14px 3px',fontSize:'0.62rem',fontWeight:700,letterSpacing:'0.10em',textTransform:'uppercase',color:'rgba(255,246,221,0.32)',margin:0}}>
                      Par cycle
                    </p>
                  )}

                  {cyclesActifs.map((c)=>{
                    const Icon         = CYCLE_ICONES[c.cycle] ?? School
                    const estCe        = cycleURL===c.cycle
                    const estDeplie    = cycleDeplie===c.cycle
                    const hrefCycle    = `${configBase}?cycle=${c.cycle}&onglet=${CYCLE_ONGLET_DEFAUT[c.cycle]}`

                    return (
                      <div key={c.uuid}>
                        {/* Ligne du cycle : clic gauche → navigate, clic flèche → déplier */}
                        <div style={{display:'flex',alignItems:'center'}}>
                          <Link
                            to={hrefCycle}
                            className={`pl-nav-subitem${estCe?' is-active':''}`}
                            style={{flex:1}}
                            onClick={()=>{ setCycleDeplie(c.cycle); fermerNav() }}
                          >
                            <Icon size={13} aria-hidden="true"/>
                            <span>{CYCLE_LABELS[c.cycle]}</span>
                          </Link>
                          {/* Flèche séparée pour déplier sans naviguer */}
                          <button
                            type="button"
                            aria-label={estDeplie?'Réduire':'Développer'}
                            aria-expanded={estDeplie}
                            onClick={()=>setCycleDeplie((p)=>p===c.cycle?null:c.cycle)}
                            style={{background:'none',border:0,cursor:'pointer',padding:'6px 10px 6px 4px',color:'rgba(255,246,221,0.45)',display:'flex',alignItems:'center'}}
                          >
                            {estDeplie
                              ? <ChevronDown size={12} aria-hidden="true"/>
                              : <ChevronRight size={12} aria-hidden="true"/>}
                          </button>
                        </div>

                        {/* Onglets du cycle - visibles si déplié */}
                        {estDeplie && (
                          <div className="pl-nav-submenu-nested">
                            {ONGLETS_CYCLE[c.cycle]?.map(({id,label})=>{
                              const href   = `${configBase}?cycle=${c.cycle}&onglet=${id}`
                              const actif  = estCe && ongletURL===id
                              return (
                                <Link key={id} to={href} className={`pl-nav-deepitem${actif?' is-active':''}`}
                                  onClick={fermerNav} aria-current={actif?'page':undefined}>
                                  {label}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Si aucun cycle actif → invite à en créer */}
                  {cyclesActifs.length===0 && (
                    <Link
                      to={`${configBase}?section=annees`}
                      className="pl-nav-subitem"
                      onClick={fermerNav}
                      style={{opacity:0.55,fontStyle:'italic'}}
                    >
                      <Plus size={13} aria-hidden="true"/>
                      <span>Activer des cycles</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MON COMPTE */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">MON COMPTE</p>
            <Link
              to={lienEtablissement(slug,'/compte')}
              className={`pl-nav-item${location.pathname===lienEtablissement(slug,'/compte')?' is-active':''}`}
              onClick={fermerNav}
            >
              <User size={17} aria-hidden="true"/><span>Mon profil</span>
            </Link>
          </div>

          {/* SESSION */}
          <div className="pl-nav-groupe">
            <p className="pl-nav-groupe-label">SESSION</p>
            <button type="button" className="pl-nav-item is-logout" onClick={()=>{fermerNav();logout('manual')}}>
              <LogOut size={17} aria-hidden="true"/><span>Déconnexion</span>
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
          <ThemeToggle variant="pill"/>
        </div>
      </aside>

      {navOuvert && <div className="pl-overlay" onClick={fermerNav} aria-hidden="true"/>}

      <div className="pl-main">
        <header className="pl-topbar">
          <div className="pl-topbar-left">
            <button className="pl-menu-btn" onClick={()=>setNavOuvert(true)} aria-label="Ouvrir le menu" aria-expanded={navOuvert}>
              <Menu size={22}/>
            </button>
            <h1 className="pl-topbar-title">{titreTopbar()}</h1>
          </div>
          <div className="pl-topbar-right">
            <Link to={lienEtablissement(slug,'/compte')} className="pl-topbar-user">
              <span className="pl-avatar pl-avatar--sm" aria-hidden="true">{initiales}</span>
            </Link>
            <div className="pl-topbar-sep" aria-hidden="true"/>
            <div className="pl-topbar-actions">
              <button className="pl-icon-btn" aria-label="Notifications"><Bell size={19}/></button>
              <ThemeToggle className="pl-icon-btn"/>
              <button type="button" className="pl-icon-btn pl-icon-btn--logout" onClick={()=>logout('manual')} aria-label="Déconnexion">
                <LogOut size={19}/>
              </button>
            </div>
          </div>
        </header>
        <div className="pl-content"><Outlet/></div>
      </div>
    </div>
  )
}
