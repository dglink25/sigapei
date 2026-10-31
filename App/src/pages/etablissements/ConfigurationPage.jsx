import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronRight, CheckCircle2, Clock, XCircle, RefreshCw,
  ShieldCheck, Users, Building2, GraduationCap, UserCog, KeyRound,
  AlertTriangle, Layers,
} from 'lucide-react'

import { lienEtablissement }   from '../../lib/etablissements/subdomain'
import { portailService }      from '../../services/identite/portail.service'
import { monEtablissementService } from '../../services/etablissements/monEtablissement.service'
import { demandesCycleEtabService } from '../../services/etablissements/demandesCycle.service'
import useSlugEtablissement    from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle            from '../../hooks/commun/usePageTitle'

import AccesDroitsPanel        from '../../components/etablissements/AccesDroitsPanel'
import InfosEtablissementPanel from '../../components/etablissements/InfosEtablissementPanel'
import PanneauDemandesCycle    from '../../components/etablissements/config/PanneauDemandesCycle'
import PanneauUtilisateurs     from '../../components/etablissements/config/PanneauUtilisateurs'
import PanneauDemandesRole     from '../../components/etablissements/config/PanneauDemandesRole'
import PanneauPermissionsRole  from '../../components/etablissements/config/PanneauPermissionsRole'
import PanneauServicesEtablissement from '../../components/etablissements/config/PanneauServicesEtablissement'
import { demandesServiceEtabService } from '../../services/identite/demandesService.service'
import Loader                  from '../../components/commun/Loader'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import './ConfigurationPage.css'

const CYCLE_LABELS = {
  maternelle:'Maternelle', primaire:'Primaire', secondaire:'Secondaire', universitaire:'Université',
}

const SECTION_LABELS = {
  services:            'Services assignés',
  droits:              "Droits d'accès",
  etablissement:       'Infos établissement',
  utilisateurs:        'Utilisateurs',
  'demandes-cycle':    'Cycles autorisés',
  'demandes-role':     'Demande de rôle',
  'permissions-roles': 'Permissions des rôles',
}

// ── Espaces de paramètres groupés ────────────────────────────────────
const GROUPES = [
  {
    groupe: 'Accès & Sécurité',
    items: [
      { label: 'Services assignés',    icon: Layers,      section: 'services',            desc: 'Services accordés et demandes d’accès' },
      { label: "Droits d'accès",       icon: ShieldCheck, section: 'droits',              desc: 'Gérer les accès aux services' },
      { label: 'Permissions des rôles', icon: KeyRound,    section: 'permissions-roles',   desc: 'Services et portail par rôle' },
    ],
  },
  {
    groupe: 'Établissement',
    items: [
      { label: 'Infos établissement',  icon: Building2,   section: 'etablissement',       desc: 'Logo, types, adresse, localisation' },
      { label: 'Utilisateurs',         icon: Users,       section: 'utilisateurs',        desc: 'Comptes et rôles assignés' },
      { label: 'Demande de rôle',      icon: UserCog,     section: 'demandes-role',       desc: 'Rôle personnalisé au Super Admin' },
    ],
  },
  {
    groupe: 'Académique',
    items: [
      { label: 'Cycles autorisés',     icon: GraduationCap, section: 'demandes-cycle',    desc: 'Voir les cycles accordés et en demander' },
    ],
  },
]

export default function ConfigurationPage() {
  usePageTitle('Configuration')
  const slug = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('section') ?? ''

  const [etab, setEtab] = useState(null)

  const chargerPortail = useCallback(() => {
    portailService.lire()
      .then((r) => setEtab(r?.etablissement ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => { chargerPortail() }, [chargerPortail])

  const allerA     = useCallback((params) => setSearchParams(params), [setSearchParams])
  const configBase = lienEtablissement(slug, '/configuration')

  function renduContenu() {
    if (section === 'services')            return <PanneauServicesEtablissement />
    if (section === 'droits')              return <AccesDroitsPanel />
    if (section === 'etablissement')       return <InfosEtablissementPanel />
    if (section === 'demandes-cycle')      return <PanneauDemandesCycle />
    if (section === 'utilisateurs')        return <PanneauUtilisateurs />
    if (section === 'demandes-role')       return <PanneauDemandesRole />
    if (section === 'permissions-roles')   return <PanneauPermissionsRole />
    return <VueEnsemble etab={etab} allerA={allerA} slug={slug} onRefresh={chargerPortail} />
  }

  // Fil d'ariane : uniquement sur les sous-sections
  const migettes = [
    <Link key="p" to={lienEtablissement(slug, '/portail')}>Portail</Link>,
    <span key="s1" className="ap-bread-sep">/</span>,
    <Link key="c" to={configBase}>Configuration</Link>,
  ]
  if (section) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="se">{SECTION_LABELS[section] ?? section}</span>)
  }

  return (
    <div className="ap cfg">
      {section && (
        <nav className="ap-bread" aria-label="Fil d'ariane">{migettes}</nav>
      )}
      {renduContenu()}
    </div>
  )
}

/* ── Vue d'ensemble - design identique au Dashboard ─────────────────── */
function VueEnsemble({ etab, allerA, slug, onRefresh }) {
  const [cyclesAutorises, setCyclesAutorises]   = useState([])
  const [demandes, setDemandes]                 = useState([])
  const [demandesSrv, setDemandesSrv]           = useState([])
  const [servicesCount, setServicesCount]       = useState(0)
  const [loading, setLoading]                   = useState(true)
  const [initialLoading, setInitialLoading]     = useState(true)

  const charger = useCallback(() => {
    setLoading(true)
    let annule = false
    Promise.all([
      monEtablissementService.lire(),
      demandesCycleEtabService.lister(),
      demandesServiceEtabService.listerMesDemandes().catch(() => []),
      portailService.lire().catch(() => null),
    ]).then(([profil, rDem, rDemSrv, rPortail]) => {
      if (annule) return
      setCyclesAutorises(
        (profil?.cyclesAutorises ?? []).filter((x) => x.statut === 'actif').map((x) => x.cycle),
      )
      const listeDem = Array.isArray(rDem?.data) ? rDem.data : Array.isArray(rDem) ? rDem : []
      setDemandes(listeDem)
      const listeDemSrv = Array.isArray(rDemSrv?.data) ? rDemSrv.data : Array.isArray(rDemSrv) ? rDemSrv : []
      setDemandesSrv(listeDemSrv)
      setServicesCount((rPortail?.services ?? []).length)
    }).catch(() => {}).finally(() => {
      if (!annule) {
        setLoading(false)
        setInitialLoading(false)
      }
    })
    return () => { annule = true }
  }, [])

  useEffect(() => { charger() }, [charger])

  const demSrvEnAttente = demandesSrv.filter((d) => d.statut === 'en_attente')
  const enAttente = demandes.filter((d) => d.statut === 'en_attente')
  const refusees  = demandes.filter((d) => d.statut === 'refusee')
  const fmt       = (v) => v === null || v === undefined ? '-' : String(v)
  const base      = lienEtablissement(slug, '/configuration')

  if (initialLoading) {
    return (
      <div style={{ minHeight: 380, display: 'grid', placeItems: 'center', padding: '60px 0' }}>
        <Loader mode="inline" label="Chargement de la configuration…" />
      </div>
    )
  }

  return (
    <>
      {/* Bandeau accueil */}
      <section className="cf-welcome">
        <div>
          <h2 className="cf-welcome-title">
            Configuration{etab ? ` · ${etab.nom}` : ''}
          </h2>
          <p className="cf-welcome-sub">
            Gérez les paramètres de votre établissement. La gestion académique se fait dans{' '}
            <Link to={lienEtablissement(slug, '/scolarite')} style={{ color:'#FFF6DD', fontWeight:700, textDecoration:'underline' }}>
              Scolarité
            </Link>.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button
            type="button"
            className="ap-btn ap-btn--ghost ap-btn--sm"
            onClick={() => { charger(); onRefresh?.() }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          <Link to={`${base}?section=services`} className="ap-btn ap-btn--gold">
            Gérer les services <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* KPI stats */}
      <div className="cf-stats" style={{ marginBottom: 28 }}>
        <Link to={`${base}?section=services`} className="cf-stat cf-stat--success" style={{ textDecoration: 'none' }}>
          <div className="cf-stat-icon"><Layers size={20} aria-hidden="true" /></div>
          <div>
            <p className="cf-stat-val">
              {loading ? (
                <span className="cf-stat-loading" aria-label="Chargement…">
                  <span className="ld-spin--mini" />
                </span>
              ) : (
                fmt(servicesCount)
              )}
            </p>
            <p className="cf-stat-lbl">Services assignés</p>
          </div>
        </Link>
        <Link to={`${base}?section=services`} className={`cf-stat ${demSrvEnAttente.length > 0 ? 'cf-stat--warn' : 'cf-stat--info'}`} style={{ textDecoration: 'none' }}>
          <div className="cf-stat-icon"><Clock size={20} aria-hidden="true" /></div>
          <div>
            <p className="cf-stat-val">
              {loading ? (
                <span className="cf-stat-loading" aria-label="Chargement…">
                  <span className="ld-spin--mini" />
                </span>
              ) : (
                fmt(demSrvEnAttente.length)
              )}
            </p>
            <p className="cf-stat-lbl">Demandes service en cours</p>
          </div>
        </Link>
        <div className="cf-stat cf-stat--info">
          <div className="cf-stat-icon"><CheckCircle2 size={20} aria-hidden="true" /></div>
          <div>
            <p className="cf-stat-val">
              {loading ? (
                <span className="cf-stat-loading" aria-label="Chargement…">
                  <span className="ld-spin--mini" />
                </span>
              ) : (
                fmt(cyclesAutorises.length)
              )}
            </p>
            <p className="cf-stat-lbl">Cycles autorisés</p>
          </div>
        </div>
        <div className={`cf-stat ${enAttente.length > 0 ? 'cf-stat--warn' : 'cf-stat--info'}`}>
          <div className="cf-stat-icon"><Clock size={20} aria-hidden="true" /></div>
          <div>
            <p className="cf-stat-val">
              {loading ? (
                <span className="cf-stat-loading" aria-label="Chargement…">
                  <span className="ld-spin--mini" />
                </span>
              ) : (
                fmt(enAttente.length)
              )}
            </p>
            <p className="cf-stat-lbl">Demandes cycle en attente</p>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {!loading && !initialLoading && cyclesAutorises.length === 0 && enAttente.length === 0 && (
        <div className="cf-info">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Aucun cycle autorisé</strong>
            <p>
              <Link to={`${base}?section=demandes-cycle`}>
                Soumettez une demande de cycle
              </Link>{' '}
              pour débloquer la configuration académique dans Scolarité.
            </p>
          </div>
        </div>
      )}

      {/* Cycles autorisés - aperçu */}
      {(cyclesAutorises.length > 0 || enAttente.length > 0) && (
        <section style={{ marginBottom: 28 }}>
          <h3 className="cf-section-title">Cycles autorisés</h3>
          <div className="ap-card ap-card--flush">
            <table className="ap-table">
              <thead>
                <tr><th>Cycle</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {cyclesAutorises.map((id) => (
                  <tr key={id}>
                    <td><strong>{CYCLE_LABELS[id] ?? id}</strong></td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sg-green)', fontSize:'0.85rem', fontWeight:600 }}>
                        <CheckCircle2 size={14} aria-hidden="true" /> Autorisé
                      </span>
                    </td>
                  </tr>
                ))}
                {enAttente.map((d) => (
                  <tr key={`att-${d.uuid ?? d.cycle}`}>
                    <td><strong>{CYCLE_LABELS[d.cycle] ?? d.cycle}</strong></td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:6, color:'var(--sg-gold)', fontSize:'0.85rem', fontWeight:600 }}>
                        <Clock size={14} aria-hidden="true" /> En attente
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Paramètres groupés - grille de cartes (identique Dashboard) */}
      {GROUPES.map((g) => (
        <section key={g.groupe} style={{ marginBottom: 28 }}>
          <h3 className="cf-section-title">{g.groupe}</h3>
          <div className="cf-grid">
            {g.items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.section}
                  to={`${base}?section=${item.section}`}
                  className="cf-card ap-card ap-card--hover"
                >
                  <div className="cf-card-icon"><Icon size={26} aria-hidden="true" /></div>
                  <p className="cf-card-label">{item.label}</p>
                  <p className="cf-card-desc">{item.desc}</p>
                  <ChevronRight size={15} className="cf-card-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}