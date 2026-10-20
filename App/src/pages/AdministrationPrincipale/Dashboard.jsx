import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Users, FileText, BarChart3, Settings, Layers,
  ChevronRight, TrendingUp, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react'
import { useAuth }          from '../../context/identite/AuthContext'
import { useNotify }        from '../../context/commun/NotifyContext'
import { COMPTE_PATH }      from '../../config/identite/routes'
import { ADMIN_PATHS }      from '../../config/etablissements/config'
import { SERVICE_PATHS }    from '../../config/services/config'
import { adminService }     from '../../services/etablissements/etablissement.service'
import { normaliserDemande } from '../../lib/etablissements/form'
import './admin.css'
import './Dashboard.css'

const ESPACES = [
  { label: 'Demandes',       icon: FileText,   path: ADMIN_PATHS.demandes,         desc: 'Instruire les dossiers' },
  { label: 'Établissements', icon: Building2,  path: ADMIN_PATHS.etablissements,   desc: 'Gérer le réseau' },
  { label: 'Services',       icon: Layers,     path: SERVICE_PATHS.liste,          desc: 'Catalogue & accès' },
  { label: 'Indicateurs',    icon: BarChart3,  path: '/admin/indicateurs',          desc: 'Tableaux de bord' },
  { label: 'Utilisateurs',   icon: Users,      path: '/admin/utilisateurs',         desc: 'Comptes & rôles' },
  { label: 'Rapports',       icon: TrendingUp, path: '/admin/rapports',             desc: 'Statistiques' },
  { label: 'Paramètres',     icon: Settings,   path: COMPTE_PATH,                   desc: 'Configuration' },
]

export default function Dashboard() {
  const { user }  = useAuth()
  const notify    = useNotify()
  const nom       = user?.nomComplet ?? user?.nom_complet ?? 'Super Admin'

  /* Statistiques en temps réel depuis les demandes */
  const [items,   setItems]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems((await adminService.lister()).map(normaliserDemande))
    } catch (err) {
      notify.fromError(err)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const stats = useMemo(() => {
    const total      = items?.length ?? null
    const soumises   = items?.filter(d => d.statut === 'soumise').length ?? null
    const validees   = items?.filter(d => d.statut === 'validee').length ?? null
    const correction = items?.filter(d => d.statut === 'correction_demandee').length ?? null
    return [
      { label: 'À instruire',       valeur: soumises,   tone: 'warn',    icon: Clock },
      { label: 'Validées',          valeur: validees,   tone: 'success', icon: CheckCircle2 },
      { label: 'Dossiers total',    valeur: total,      tone: 'info',    icon: FileText },
      { label: 'En correction',     valeur: correction, tone: 'danger',  icon: AlertTriangle },
    ]
  }, [items])

  const fmt = (v) => (v === null ? '-' : String(v))

  return (
    <div className="ap db">

      {/* Bienvenue */}
      <section className="db-welcome">
        <div>
          <h2 className="db-welcome-title">Bienvenue, {nom.split(' ')[0]}</h2>
          <p className="db-welcome-sub">Vue d'ensemble de la plateforme SIGAPEI</p>
        </div>
        <Link to={ADMIN_PATHS.demandes} className="ap-btn ap-btn--gold">
          Voir les demandes <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </section>

      {/* Statistiques */}
      <div className="db-stats">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`db-stat db-stat--${s.tone}`}>
              <div className="db-stat-icon"><Icon size={20} aria-hidden="true" /></div>
              <div>
                <p className="db-stat-val">{loading ? '…' : fmt(s.valeur)}</p>
                <p className="db-stat-lbl">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Espaces de travail */}
      <section>
        <h3 className="db-section-title">Espaces de travail</h3>
        <div className="db-grid">
          {ESPACES.map(e => {
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

      {/* Bandeau info */}
      <div className="db-info">
        <Settings size={17} aria-hidden="true" />
        <div>
          <strong>Plateforme en déploiement progressif</strong>
          <p>
            Certains modules sont en construction. Les demandes d'inscription sont disponibles
            dès maintenant dans{' '}
            <Link to={ADMIN_PATHS.demandes}>Espaces Métier → Demandes</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
