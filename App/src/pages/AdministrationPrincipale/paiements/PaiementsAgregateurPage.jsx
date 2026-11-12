/**
 * Page : Gestion des agrégateurs de paiement (super admin)
 * Route : /admin/paiements/agregateurs
 *
 * Permet d'activer/suspendre FedaPay, Kkiapay, CinetPay,
 * et de basculer entre environnement test ↔ production.
 */
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Zap, ZapOff, Settings, AlertTriangle } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import ConfirmDialog from '../../../components/commun/ConfirmDialog'
import Drawer from '../../../components/administration/Drawer'
import Switch from '../../../components/administration/Switch'
import { Flash, useFlash } from '../../../components/administration/Flash'
import { agregateurService } from '../../../services/paiements/paiement.service'
import { STATUT_AGREGATEUR } from '../../../config/paiements/config'
import '../admin.css'
import './paiements.css'

function StatutBadge({ statut }) {
  const cfg = STATUT_AGREGATEUR[statut] ?? { label: statut, tone: 'neutral' }
  return <span className={`ap-badge ap-badge--${cfg.tone}`}>{cfg.label}</span>
}

function AgregateurLogo({ code }) {
  const ICONS = { fedapay: '🟢', kkiapay: '🔵', cinetpay: '🟡' }
  return (
    <span className="pay-ag-icon" aria-hidden="true">{ICONS[code] ?? '💳'}</span>
  )
}

const ENV_OPTIONS = [
  { value: 'production', label: 'Production (live)' },
  { value: 'test', label: 'Test (sandbox)' },
]

export default function PaiementsAgregateurPage() {
  const notify = useNotify()
  const [flash, showFlash] = useFlash()
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [drawer, setDrawer] = useState(null) // { item }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agregateurService.lister()
      setItems(Array.isArray(data) ? data : data?.agregateurs ?? [])
    } catch (err) {
      notify.fromError(err)
      setItems(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  async function basculerStatut(item) {
    const nouveau = item.statut === 'actif' ? 'suspendu' : 'actif'
    setBusy(true)
    try {
      await agregateurService.modifier(item.uuid, { statut: nouveau })
      showFlash(`${item.nom} est maintenant ${nouveau === 'actif' ? 'actif' : 'suspendu'}.`)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  async function changerEnvironnement(item, env) {
    setBusy(true)
    try {
      await agregateurService.modifier(item.uuid, { environnement: env })
      showFlash(`Environnement de ${item.nom} basculé en ${env === 'production' ? 'production' : 'test'}.`)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setDrawer(null)
    }
  }

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Agrégateurs de paiement</h2>
          <p className="ap-page-sub">Activation et configuration des passerelles FedaPay, Kkiapay et CinetPay</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
          Actualiser
        </button>
      </div>

      <Flash flash={flash} />

      {/* Bannière avertissement si aucun agrégateur actif */}
      {items !== null && items.every(a => a.statut !== 'actif') && (
        <div className="pay-alert pay-alert--warn">
          <AlertTriangle size={16} />
          <span>Aucun agrégateur n'est actif. Les paiements sont impossibles tant qu'au moins un agrégateur n'est pas activé.</span>
        </div>
      )}

      <div className="pay-ag-grid">
        {items === null ? (
          [1, 2, 3].map(i => <div key={i} className="ap-card pay-ag-card pay-ag-card--skel" />)
        ) : items.map(ag => (
          <div key={ag.uuid} className={`ap-card pay-ag-card${ag.statut === 'actif' ? ' is-active' : ''}`}>
            {/* En-tête */}
            <div className="pay-ag-head">
              <AgregateurLogo code={ag.code} />
              <div className="pay-ag-info">
                <strong>{ag.nom}</strong>
                <span className="ap-code">{ag.code}</span>
              </div>
              <StatutBadge statut={ag.statut} />
            </div>

            {/* Stats */}
            <div className="pay-ag-stats">
              <div>
                <span className="pay-ag-stat-val">{ag.nb_modes ?? 0}</span>
                <span className="pay-ag-stat-lbl">modes</span>
              </div>
              <div>
                <span className="pay-ag-stat-val" style={{ color: 'var(--ap-green)' }}>{ag.nb_modes_actifs ?? 0}</span>
                <span className="pay-ag-stat-lbl">actifs</span>
              </div>
              <div>
                <span className={`pay-ag-stat-val pay-ag-env pay-ag-env--${ag.environnement}`}>
                  {ag.environnement === 'production' ? 'Live' : 'Test'}
                </span>
                <span className="pay-ag-stat-lbl">env.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pay-ag-actions">
              <div className="pay-ag-switch-row">
                <label htmlFor={`sw-${ag.uuid}`} className="pay-ag-switch-label">
                  {ag.statut === 'actif' ? 'Actif' : 'Inactif'}
                </label>
                <Switch
                  id={`sw-${ag.uuid}`}
                  checked={ag.statut === 'actif'}
                  onChange={() => setConfirm({ type: ag.statut === 'actif' ? 'suspendre' : 'activer', item: ag })}
                  label={`${ag.statut === 'actif' ? 'Désactiver' : 'Activer'} ${ag.nom}`}
                  busy={busy}
                />
              </div>
              <button
                type="button"
                className="ap-btn ap-btn--ghost ap-btn--sm"
                onClick={() => setDrawer({ item: ag })}
              >
                <Settings size={14} />
                Configurer
              </button>
            </div>

            {ag.activation_le && (
              <p className="pay-ag-meta">
                Activé le {new Date(ag.activation_le).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Dialog confirmation activation/suspension */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={confirm.type === 'activer' ? `Activer ${confirm.item.nom}` : `Suspendre ${confirm.item.nom}`}
          message={
            confirm.type === 'activer'
              ? `Les établissements qui ont un accord actif avec ${confirm.item.nom} pourront encaisser et décaisser. Confirmez-vous l'activation ?`
              : `Tous les paiements via ${confirm.item.nom} seront bloqués immédiatement. Les transactions en cours ne seront pas affectées.`
          }
          confirmLabel={confirm.type === 'activer' ? 'Activer' : 'Suspendre'}
          variant={confirm.type === 'activer' ? 'default' : 'danger'}
          busy={busy}
          onConfirm={() => basculerStatut(confirm.item)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Drawer configuration environnement */}
      {drawer && (
        <Drawer
          open={!!drawer}
          title={`Configurer ${drawer.item.nom}`}
          subtitle={`Agrégateur ${drawer.item.code}`}
          onClose={() => !busy && setDrawer(null)}
          busy={busy}
          footer={
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setDrawer(null)} disabled={busy}>
              Fermer
            </button>
          }
        >
          <div className="pay-drawer-section">
            <h3 className="pay-drawer-section-title">Environnement</h3>
            <p className="pay-drawer-hint">
              <strong>Attention</strong> - basculer en test rejettera tous les paiements réels.
              Basculer en production activera les transactions financières réelles.
            </p>
            <div className="pay-env-choices">
              {ENV_OPTIONS.map(opt => (
                <label key={opt.value} className={`pay-env-choice${drawer.item.environnement === opt.value ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="env"
                    value={opt.value}
                    checked={drawer.item.environnement === opt.value}
                    onChange={() => changerEnvironnement(drawer.item, opt.value)}
                    disabled={busy}
                  />
                  <span>{opt.label}</span>
                  {drawer.item.environnement === opt.value && (
                    <span className="ap-badge ap-badge--success" style={{ marginLeft: 'auto' }}>Actuel</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="pay-drawer-section">
            <h3 className="pay-drawer-section-title">Clés API</h3>
            <p className="pay-drawer-hint">
              Les clés API sont configurées dans le fichier <span className="ap-code">.env</span> du microservice paiements.
              Elles ne sont jamais exposées dans l'interface pour des raisons de sécurité.
            </p>
            <div className="pay-key-row">
              <span className="pay-key-label">Clé secrète</span>
              <span className="ap-code">••••••••••••</span>
            </div>
            <div className="pay-key-row">
              <span className="pay-key-label">Secret webhook</span>
              <span className="ap-code">••••••••••••</span>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
