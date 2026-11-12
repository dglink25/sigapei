/**
 * Page : Tableau de bord paiements (super admin)
 * Route : /admin/paiements
 *
 * Vue d'ensemble : agrégateurs, encaissements, décaissements, interrupteurs actifs.
 * Point d'entrée de la section paiements dans le menu super admin.
 */
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Zap, TrendingUp, TrendingDown, AlertOctagon, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotify } from '../../../context/commun/NotifyContext'
import { paiementAdminService, interrupteurService, parametresPlatformeService } from '../../../services/paiements/paiement.service'
import { PAIEMENT_PATHS, STATUT_AGREGATEUR } from '../../../config/paiements/config'
import '../admin.css'
import './paiements.css'

function KpiCard({ label, value, sub, tone = 'neutral', icon: Icon, to }) {
  const content = (
    <div className={`pay-kpi pay-kpi--${tone}`}>
      {Icon && <Icon size={20} className="pay-kpi-ico" />}
      <div>
        <span className="pay-kpi-val">{value}</span>
        <span className="pay-kpi-lbl">{label}</span>
        {sub && <span className="pay-kpi-sub">{sub}</span>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="pay-kpi-link">{content}</Link> : content
}

export default function PaiementsStatsPage() {
  const notify = useNotify()
  const [stats, setStats] = useState(null)
  const [interrupteurs, setInterrupteurs] = useState([])
  const [parametres, setParametres] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, inter, params] = await Promise.all([
        paiementAdminService.stats(),
        interrupteurService.lister(),
        parametresPlatformeService.lister().catch(() => []),
      ])
      setStats(s)
      setInterrupteurs(Array.isArray(inter) ? inter : inter?.interrupteurs ?? [])
      setParametres(Array.isArray(params) ? params : params?.parametres ?? [])
    } catch (err) {
      notify.fromError(err)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const enc = stats?.encaissements ?? {}
  const dec = stats?.decaissements ?? {}
  const ags = stats?.agregateurs ?? []

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Paiements — Vue d'ensemble</h2>
          <p className="ap-page-sub">Supervision globale des flux financiers de la plateforme</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Alerte interrupteurs actifs */}
      {interrupteurs.length > 0 && (
        <div className="pay-alert pay-alert--danger">
          <AlertOctagon size={16} />
          <span>
            <strong>{interrupteurs.length} interrupteur(s) de sécurité actif(s)</strong> — des paiements peuvent être bloqués.
            <Link to={PAIEMENT_PATHS.interrupteurs} style={{ marginLeft: 8, color: 'inherit', fontWeight: 700 }}>Voir →</Link>
          </span>
        </div>
      )}

      {/* KPIs encaissements */}
      <section className="pay-section">
        <h3 className="pay-section-title"><TrendingDown size={16} /> Encaissements</h3>
        <div className="pay-kpi-grid">
          <KpiCard label="Total" value={enc.total ?? '—'} tone="neutral" />
          <KpiCard label="Disponibles" value={enc.disponibles ?? '—'} tone="success" sub="Fonds disponibles" />
          <KpiCard label="En attente règlement" value={enc.en_attente_reglement ?? '—'} tone="warning" sub="Délai agrégateur non écoulé" />
          <KpiCard label="Dernières 24h" value={enc.derniere_24h ?? '—'} tone="info" />
        </div>
      </section>

      {/* KPIs décaissements */}
      <section className="pay-section">
        <h3 className="pay-section-title"><TrendingUp size={16} /> Décaissements</h3>
        <div className="pay-kpi-grid">
          <KpiCard label="Total" value={dec.total ?? '—'} tone="neutral" />
          <KpiCard label="Envoyés" value={dec.envoyes ?? '—'} tone="success" />
          <KpiCard label="En cours" value={dec.en_cours ?? '—'} tone="warning" />
          <KpiCard label="Échoués" value={dec.echoues ?? '—'} tone="danger" sub="À vérifier" />
        </div>
      </section>

      {/* Agrégateurs */}
      <section className="pay-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="pay-section-title" style={{ margin: 0 }}><Zap size={16} /> Agrégateurs</h3>
          <Link to={PAIEMENT_PATHS.agregateurs} className="ap-btn ap-btn--ghost ap-btn--sm">
            <Settings size={14} /> Gérer
          </Link>
        </div>
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Agrégateur</th>
                <th>Statut</th>
                <th>Encaissements</th>
              </tr>
            </thead>
            <tbody>
              {ags.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--ap-muted)', padding: '24px' }}>
                  {loading ? 'Chargement…' : 'Aucune donnée'}
                </td></tr>
              ) : ags.map(ag => {
                const cfg = STATUT_AGREGATEUR[ag.statut] ?? { label: ag.statut, tone: 'neutral' }
                return (
                  <tr key={ag.code}>
                    <td><strong>{ag.nom ?? ag.code}</strong><small><span className="ap-code">{ag.code}</span></small></td>
                    <td><span className={`ap-badge ap-badge--${cfg.tone}`}>{cfg.label}</span></td>
                    <td>{ag.nb_encaissements ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Paramètres plateforme */}
      {parametres.length > 0 && (
        <section className="pay-section">
          <h3 className="pay-section-title"><Settings size={16} /> Paramètres plateforme</h3>
          <div className="ap-card ap-card--flush">
            <table className="ap-table">
              <thead>
                <tr><th>Devise</th><th>Commission avance</th><th>Seuil approbation remboursement</th></tr>
              </thead>
              <tbody>
                {parametres.map(p => (
                  <tr key={p.devise}>
                    <td><span className="ap-code">{p.devise}</span></td>
                    <td>
                      {parseFloat(p.commission_avance_taux) > 0 ? `${p.commission_avance_taux}%` : '—'}
                      {Number(p.commission_avance_min) > 0 ? ` min. ${Number(p.commission_avance_min).toLocaleString('fr-FR')}` : ''}
                    </td>
                    <td>
                      {p.seuil_approbation_remboursement
                        ? `${Number(p.seuil_approbation_remboursement).toLocaleString('fr-FR')} ${p.devise}`
                        : <span className="ap-muted">Tout remboursement requiert approbation</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Liens rapides */}
      <section className="pay-section">
        <h3 className="pay-section-title">Actions rapides</h3>
        <div className="pay-links-grid">
          <Link to={PAIEMENT_PATHS.agregateurs} className="ap-card ap-card--hover pay-link-card">
            <Zap size={20} />
            <strong>Agrégateurs</strong>
            <span>Activer / suspendre FedaPay, Kkiapay, CinetPay</span>
          </Link>
          <Link to={PAIEMENT_PATHS.modesPaiement} className="ap-card ap-card--hover pay-link-card">
            <TrendingDown size={20} />
            <strong>Modes de paiement</strong>
            <span>Encaissements et décaissements disponibles</span>
          </Link>
          <Link to={PAIEMENT_PATHS.accords} className="ap-card ap-card--hover pay-link-card">
            <TrendingUp size={20} />
            <strong>Accords établissements</strong>
            <span>Habiliter un établissement à un mode</span>
          </Link>
          <Link to={PAIEMENT_PATHS.audit} className="ap-card ap-card--hover pay-link-card">
            <Settings size={20} />
            <strong>Journal d'audit</strong>
            <span>Toutes les opérations avec chaînage SHA-256</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
