import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Users, FileText, BarChart3, Settings, Layers,
  ChevronRight, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  ShieldCheck, RefreshCw, GitBranch,
} from 'lucide-react'
import { useAuth }          from '../../context/identite/AuthContext'
import { useNotify }        from '../../context/commun/NotifyContext'
import { COMPTE_PATH }      from '../../config/identite/routes'
import { ADMIN_PATHS }      from '../../config/etablissements/config'
import { SERVICE_PATHS }    from '../../config/services/config'
import { adminService }     from '../../services/etablissements/etablissement.service'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import { demandesCycleAdminService } from '../../services/etablissements/demandesCycle.service'
import { demandesRoleAdminService }  from '../../services/identite/rolesEtablissements.service'
import { demandesServiceAdminService } from '../../services/identite/demandesService.service'
import { normaliserDemande } from '../../lib/etablissements/form'
import Loader from '../../components/commun/Loader'
import './admin.css'
import './Dashboard.css'

// ── Espaces de travail mis à jour ─────────────────────────────────────
const ESPACES = [
  {
    groupe: 'Établissements',
    items: [
      { label: 'Demandes',          icon: FileText,     path: ADMIN_PATHS.demandes,       desc: 'Instruire les dossiers d\'inscription' },
      { label: 'Établissements',    icon: Building2,    path: ADMIN_PATHS.etablissements, desc: 'Gérer le réseau d\'établissements' },
      { label: 'Extensions cycle',  icon: GitBranch,    path: '/admin/demandes-cycle',    desc: 'Instruire les demandes de cycle' },
    ],
  },
  {
    groupe: 'Identité & Accès',
    items: [
      { label: 'Services',             icon: Layers,       path: SERVICE_PATHS.liste,        desc: 'Catalogue des services & assignations' },
      { label: 'Demandes de service',  icon: Layers,       path: '/admin/demandes-service',  desc: 'Instruire les demandes d\'activation' },
      { label: 'Utilisateurs',         icon: Users,        path: '/admin/utilisateurs',      desc: 'Tous les comptes de la plateforme' },
      { label: 'Rôles',                icon: ShieldCheck,  path: '/admin/roles',             desc: 'Gérer les rôles et permissions' },
      { label: 'Demandes de rôle',     icon: ShieldCheck,  path: '/admin/demandes-role',     desc: 'Instruire les demandes de rôle' },
    ],
  },
  {
    groupe: 'Pilotage',
    items: [
      { label: 'Indicateurs',       icon: BarChart3,    path: '/admin/indicateurs',       desc: 'Tableaux de bord' },
      { label: 'Rapports',          icon: TrendingUp,   path: '/admin/rapports',          desc: 'Statistiques avancées' },
      { label: 'Paramètres',        icon: Settings,     path: COMPTE_PATH,                desc: 'Mon compte' },
    ],
  },
]

// ── Composant ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user }  = useAuth()
  const notify    = useNotify()
  const nom       = user?.nomComplet ?? user?.nom_complet ?? 'Super Admin'

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [demandes, utilisateurs, demandesCycle, demandesRole, statDemService] = await Promise.allSettled([
        adminService.lister(),
        utilisateursService.lister({ limite: 1 }),
        demandesCycleAdminService.lister('en_attente'),
        demandesRoleAdminService.listerToutesDemandes('en_attente'),
        demandesServiceAdminService.compteurs(),
      ])

      const demandesListe  = demandes.status === 'fulfilled'       ? (demandes.value ?? []).map(normaliserDemande) : []
      const nbUtilisateurs = utilisateurs.status === 'fulfilled'   ? (utilisateurs.value?.data?.pagination?.total ?? utilisateurs.value?.pagination?.total ?? 0) : null

      // Normaliser : les services peuvent retourner un tableau direct ou { data: [...] }
      const extraireListe = (r) => {
        if (!r || r.status !== 'fulfilled') return null
        const val = r.value
        if (Array.isArray(val)) return val.length
        if (Array.isArray(val?.data)) return val.data.length
        if (Array.isArray(val?.data?.data)) return val.data.data.length
        return 0
      }
      const nbDemCycle = extraireListe(demandesCycle)
      const nbDemRole  = extraireListe(demandesRole)
      const nbDemService = statDemService.status === 'fulfilled' ? (statDemService.value?.enAttente ?? 0) : 0
      setData({ demandesListe, nbUtilisateurs, nbDemCycle, nbDemRole, nbDemService })
    } catch (err) {
      notify.fromError(err)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  // KPIs dossiers établissements
  const soumises   = data?.demandesListe?.filter(d => d.statut === 'soumise').length ?? null
  const validees   = data?.demandesListe?.filter(d => d.statut === 'validee').length ?? null
  const total      = data?.demandesListe?.length ?? null
  const correction = data?.demandesListe?.filter(d => d.statut === 'correction_demandee').length ?? null

  const fmt = (v) => v === null ? '-' : String(v)

  if (data === null) {
    return (
      <div className="ap db" style={{ minHeight: 380, display: 'grid', placeItems: 'center', padding: '60px 0' }}>
        <Loader mode="inline" label="Chargement du tableau de bord…" />
      </div>
    )
  }

  return (
    <div className="ap db">

      {/* Bienvenue */}
      <section className="db-welcome">
        <div>
          <h2 className="db-welcome-title">Bienvenue, {nom.split(' ')[0]}</h2>
          <p className="db-welcome-sub">Vue d'ensemble de la plateforme SIGAPEI</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          <Link to={ADMIN_PATHS.demandes} className="ap-btn ap-btn--gold">
            Voir les demandes <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* KPIs - deux lignes : dossiers + plateforme */}
      <div className="db-stats" style={{ marginBottom: 8 }}>
        <div className="db-stat db-stat--warn">
          <div className="db-stat-icon"><Clock size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(soumises)}
            </p>
            <p className="db-stat-lbl">Dossiers à instruire</p>
          </div>
        </div>
        <div className="db-stat db-stat--success">
          <div className="db-stat-icon"><CheckCircle2 size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(validees)}
            </p>
            <p className="db-stat-lbl">Établissements validés</p>
          </div>
        </div>
        <div className="db-stat db-stat--info">
          <div className="db-stat-icon"><FileText size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(total)}
            </p>
            <p className="db-stat-lbl">Dossiers total</p>
          </div>
        </div>
        <div className="db-stat db-stat--danger">
          <div className="db-stat-icon"><AlertTriangle size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(correction)}
            </p>
            <p className="db-stat-lbl">En correction</p>
          </div>
        </div>
      </div>

      {/* KPIs - nouvelles fonctionnalités */}
      <div className="db-stats" style={{ marginBottom: 28 }}>
        <div className="db-stat db-stat--info">
          <div className="db-stat-icon"><Users size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(data?.nbUtilisateurs)}
            </p>
            <p className="db-stat-lbl">Utilisateurs</p>
          </div>
        </div>
        <Link to="/admin/demandes-service" className={`db-stat${data?.nbDemService > 0 ? ' db-stat--warn' : ' db-stat--info'}`} style={{ textDecoration: 'none' }}>
          <div className="db-stat-icon"><Layers size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(data?.nbDemService)}
            </p>
            <p className="db-stat-lbl">Demandes service en attente</p>
          </div>
        </Link>
        <Link to="/admin/demandes-cycle" className={`db-stat${data?.nbDemCycle > 0 ? ' db-stat--warn' : ' db-stat--info'}`} style={{ textDecoration: 'none' }}>
          <div className="db-stat-icon"><GitBranch size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(data?.nbDemCycle)}
            </p>
            <p className="db-stat-lbl">Demandes cycle en attente</p>
          </div>
        </Link>
        <Link to="/admin/demandes-role" className={`db-stat${data?.nbDemRole > 0 ? ' db-stat--warn' : ' db-stat--info'}`} style={{ textDecoration: 'none' }}>
          <div className="db-stat-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
          <div>
            <p className="db-stat-val">
              {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : fmt(data?.nbDemRole)}
            </p>
            <p className="db-stat-lbl">Demandes rôle en attente</p>
          </div>
        </Link>
      </div>

      {/* Espaces de travail par groupe */}
      {ESPACES.map((groupe) => (
        <section key={groupe.groupe} style={{ marginBottom: 28 }}>
          <h3 className="db-section-title">{groupe.groupe}</h3>
          <div className="db-grid">
            {groupe.items.map((e) => {
              const Icon = e.icon
              return (
                <Link key={e.label} to={e.path} className="db-card ap-card ap-card--hover">
                  <div className="db-card-icon"><Icon size={26} aria-hidden="true" /></div>
                  <p className="db-card-label">{e.label}</p>
                  <p className="db-card-desc">{e.desc}</p>
                  <ChevronRight size={15} className="db-card-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {/* Alertes en attente si des actions requises */}
      {(data?.nbDemService > 0 || data?.nbDemCycle > 0 || data?.nbDemRole > 0 || soumises > 0) && (
        <div className="db-info" style={{ borderColor:'rgba(233,170,32,0.4)', background:'rgba(233,170,32,0.06)' }}>
          <AlertTriangle size={17} aria-hidden="true" style={{ color:'#a07010' }} />
          <div>
            <strong>Actions en attente</strong>
            <p>
              {soumises > 0 && <><Link to={ADMIN_PATHS.demandes}>{soumises} dossier(s) d'établissement</Link> à instruire. </>}
              {data?.nbDemService > 0 && <><Link to="/admin/demandes-service">{data.nbDemService} demande(s) de service</Link> à instruire. </>}
              {data?.nbDemCycle > 0 && <><Link to="/admin/demandes-cycle">{data.nbDemCycle} demande(s) de cycle</Link> à instruire. </>}
              {data?.nbDemRole > 0 && <><Link to="/admin/demandes-role">{data.nbDemRole} demande(s) de rôle</Link> à instruire.</>}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
