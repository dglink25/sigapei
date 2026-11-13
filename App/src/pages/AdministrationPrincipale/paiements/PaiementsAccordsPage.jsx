/**
 * Page : Accords établissements (super admin)
 * Route : /admin/paiements/accords
 *
 * Assigne (ou retire) l'accès à un mode de paiement précis pour un établissement.
 * C'est ici que le super admin "débloque" FedaPay/Kkiapay/CinetPay pour un établissement.
 * Un établissement ne peut encaisser/décaisser que via les modes qui lui sont accordés.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, RefreshCw, Search, CheckCircle, XCircle, PauseCircle, ChevronDown,
} from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import ConfirmDialog from '../../../components/commun/ConfirmDialog'
import Drawer from '../../../components/administration/Drawer'
import { Flash, useFlash } from '../../../components/administration/Flash'
import { SkeletonList } from '../../../components/administration/Skeleton'
import {
  accordService, modePaiementService, paiementAdminService,
} from '../../../services/paiements/paiement.service'
import { adminService } from '../../../services/etablissements/etablissement.service'
import {
  STATUT_ACCORD, SENS_LABELS, TYPE_LABELS,
} from '../../../config/paiements/config'
import '../admin.css'
import './paiements.css'

function StatutBadge({ statut }) {
  const cfg = STATUT_ACCORD[statut] ?? { label: statut, tone: 'neutral' }
  const icons = { accorde: CheckCircle, suspendu: PauseCircle, revoque: XCircle, refuse: XCircle }
  const Icon = icons[statut] ?? null
  return (
    <span className={`ap-badge ap-badge--${cfg.tone}`}>
      {Icon && <Icon size={11} style={{ marginRight: 4 }} />}
      {cfg.label}
    </span>
  )
}

const VIDE_FORM = { etablissementUuid: '', modePaiementId: '', plafondAvance: '' }

export default function PaiementsAccordsPage() {
  const notify = useNotify()
  const [flash, showFlash] = useFlash()

  const [accords, setAccords] = useState(null)
  const [modes, setModes] = useState([])
  const [etablissements, setEtablissements] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const [tabStatut, setTabStatut] = useState('tous')
  const [tabAgreg, setTabAgreg] = useState('tous')
  const [q, setQ] = useState('')

  const [drawer, setDrawer] = useState(false)
  const [form, setForm] = useState(VIDE_FORM)
  const [confirm, setConfirm] = useState(null) // { action, accord }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [acc, mod, etabs] = await Promise.all([
        accordService.lister(),
        modePaiementService.lister({ statut: 'actif' }),
        adminService.listerEtablissements().catch(() => ({ etablissements: [] })),
      ])
      setAccords(Array.isArray(acc) ? acc : acc?.accords ?? [])
      setModes(Array.isArray(mod) ? mod : mod?.modes_paiement ?? mod?.data ?? [])
      const listeEtabs = Array.isArray(etabs) ? etabs : etabs?.etablissements ?? etabs?.items ?? []
      setEtablissements(listeEtabs.filter(e => e.statut === 'actif'))
    } catch (err) {
      notify.fromError(err)
      setAccords(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  /* Agrégateurs distincts pour les onglets */
  const agregateursCodes = useMemo(() => {
    if (!accords) return []
    return [...new Set(accords.map(a => a.agregateur_code))].sort()
  }, [accords])

  const counts = useMemo(() => {
    if (!accords) return {}
    return {
      tous: accords.length,
      accorde: accords.filter(a => a.statut === 'accorde').length,
      suspendu: accords.filter(a => a.statut === 'suspendu').length,
      revoque: accords.filter(a => a.statut === 'revoque').length,
    }
  }, [accords])

  const rows = useMemo(() => {
    if (!accords) return []
    const qn = q.trim().toLowerCase()
    return accords
      .filter(a => tabStatut === 'tous' || a.statut === tabStatut)
      .filter(a => tabAgreg === 'tous' || a.agregateur_code === tabAgreg)
      .filter(a => !qn
        || a.etablissement_uuid?.toLowerCase().includes(qn)
        || a.mode_libelle?.toLowerCase().includes(qn)
        || a.agregateur_code?.toLowerCase().includes(qn))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [accords, tabStatut, tabAgreg, q])

  async function accorder() {
    if (!form.etablissementUuid || !form.modePaiementId) {
      notify.error('Données manquantes', 'Sélectionnez un établissement et un mode de paiement.')
      return
    }
    setBusy(true)
    try {
      await accordService.accorder({
        etablissementUuid: form.etablissementUuid,
        modePaiementId: Number(form.modePaiementId),
        plafondAvance: form.plafondAvance ? Number(form.plafondAvance) : null,
      })
      notify.success('Accord accordé', 'L\'établissement peut maintenant utiliser ce mode de paiement.')
      setDrawer(false)
      setForm(VIDE_FORM)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function changerStatut(action, accord) {
    setBusy(true)
    try {
      await accordService.modifierStatut(
        accord.uuid,
        action,
        confirm?.motif ?? undefined,
      )
      const labels = { suspendu: 'suspendu', revoque: 'révoqué', accorde: 'réactivé' }
      showFlash(`Accord ${labels[action] ?? action}.`)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const nomEtab = (uuid) => etablissements.find(e => e.uuid === uuid)?.nom ?? uuid?.slice(0, 8) + '…'
  const dateFr = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '-'

  /* Modes actifs groupés par agrégateur pour le select */
  const modesParAgreg = useMemo(() => {
    const map = {}
    modes.forEach(m => {
      if (!map[m.agregateur_code]) map[m.agregateur_code] = []
      map[m.agregateur_code].push(m)
    })
    return map
  }, [modes])

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Accords établissements</h2>
          <p className="ap-page-sub">Habilitation des établissements à utiliser les modes de paiement</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
            Actualiser
          </button>
          <button type="button" className="ap-btn" onClick={() => { setForm(VIDE_FORM); setDrawer(true) }}>
            <Plus size={16} />
            Accorder un accès
          </button>
        </div>
      </div>

      <Flash flash={flash} />

      {/* Filtres */}
      <div className="ap-filters" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'accorde', label: 'Accordés' },
            { id: 'suspendu', label: 'Suspendus' },
            { id: 'revoque', label: 'Révoqués' },
          ].map(t => (
            <button key={t.id} type="button" className={`ap-tab${tabStatut === t.id ? ' is-active' : ''}`}
              onClick={() => setTabStatut(t.id)}>
              {t.label}<span>{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        {agregateursCodes.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`ap-tab${tabAgreg === 'tous' ? ' is-active' : ''}`} onClick={() => setTabAgreg('tous')}>
              Tous
            </button>
            {agregateursCodes.map(code => (
              <button key={code} type="button" className={`ap-tab${tabAgreg === code ? ' is-active' : ''}`} onClick={() => setTabAgreg(code)}>
                <span className="ap-code" style={{ fontSize: '0.78rem' }}>{code}</span>
              </button>
            ))}
          </div>
        )}
        <div className="etab-search" style={{ marginLeft: 'auto' }}>
          <Search size={15} />
          <input type="search" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher" />
        </div>
      </div>

      {/* Tableau */}
      <div className="ap-card ap-card--flush">
        {accords === null ? <SkeletonList rows={6} /> : rows.length === 0 ? (
          <div className="ap-empty">
            <CheckCircle size={36} />
            <p>Aucun accord ne correspond à votre recherche.</p>
            <button type="button" className="ap-btn" onClick={() => { setForm(VIDE_FORM); setDrawer(true) }}>
              <Plus size={16} /> Accorder un accès
            </button>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Mode de paiement</th>
                  <th>Agrégateur</th>
                  <th>Sens</th>
                  <th>Plafond avance</th>
                  <th>Accordé le</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => (
                  <tr key={a.uuid}>
                    <td>
                      <strong>{nomEtab(a.etablissement_uuid)}</strong>
                      <small style={{ color: 'var(--ap-muted)', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        {a.etablissement_uuid?.slice(0, 12)}…
                      </small>
                    </td>
                    <td>
                      <strong>{a.mode_libelle}</strong>
                      <small><span className="ap-code">{a.mode_code}</span></small>
                    </td>
                    <td><span className="ap-code">{a.agregateur_code}</span></td>
                    <td>
                      <span className={`ap-badge ap-badge--${a.sens === 'entree' ? 'info' : 'warning'}`}>
                        {a.sens === 'entree' ? 'Encaissement' : 'Décaissement'}
                      </span>
                    </td>
                    <td>
                      {a.plafond_avance
                        ? <span>{Number(a.plafond_avance).toLocaleString('fr-FR')} {a.devise}</span>
                        : <span className="ap-muted">-</span>}
                    </td>
                    <td>{dateFr(a.decide_le ?? a.created_at)}</td>
                    <td><StatutBadge statut={a.statut} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.statut === 'accorde' && (
                          <button type="button" className="ap-btn ap-btn--warn ap-btn--sm"
                            onClick={() => setConfirm({ action: 'suspendu', accord: a })}>
                            Suspendre
                          </button>
                        )}
                        {a.statut === 'suspendu' && (
                          <>
                            <button type="button" className="ap-btn ap-btn--sm"
                              onClick={() => changerStatut('accorde', a)}>
                              Réactiver
                            </button>
                            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm"
                              onClick={() => setConfirm({ action: 'revoque', accord: a })}>
                              Révoquer
                            </button>
                          </>
                        )}
                        {a.statut === 'revoque' && (
                          <button type="button" className="ap-btn ap-btn--sm"
                            onClick={() => changerStatut('accorde', a)}>
                            Réaccorder
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer : accorder un accès */}
      <Drawer
        open={drawer}
        title="Accorder un accès de paiement"
        subtitle="L'établissement pourra utiliser ce mode dès l'accord."
        onClose={() => !busy && setDrawer(false)}
        busy={busy}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setDrawer(false)} disabled={busy}>Annuler</button>
            <button type="button" className="ap-btn" onClick={accorder} disabled={busy}>
              {busy ? 'Traitement…' : 'Accorder'}
            </button>
          </div>
        }
      >
        <div className="pay-form">
          <div className="pay-field">
            <label>Établissement <span className="pay-req">*</span></label>
            <select value={form.etablissementUuid} onChange={e => setForm(p => ({ ...p, etablissementUuid: e.target.value }))}
              className="ap-input" data-autofocus>
              <option value="">- Sélectionner un établissement -</option>
              {etablissements.map(e => (
                <option key={e.uuid} value={e.uuid}>{e.nom}</option>
              ))}
            </select>
          </div>

          <div className="pay-field">
            <label>Mode de paiement <span className="pay-req">*</span></label>
            <select value={form.modePaiementId} onChange={e => setForm(p => ({ ...p, modePaiementId: e.target.value }))}
              className="ap-input">
              <option value="">- Sélectionner un mode -</option>
              {Object.entries(modesParAgreg).map(([code, liste]) => (
                <optgroup key={code} label={code.toUpperCase()}>
                  {liste.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.libelle} · {m.sens === 'entree' ? '↓ Encaissement' : '↑ Décaissement'} · {m.devise}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {modes.length === 0 && (
              <small className="pay-hint pay-hint--warn">
                Aucun mode actif disponible. Activez d'abord des modes de paiement.
              </small>
            )}
          </div>

          <div className="pay-field">
            <label>Plafond d'avance (optionnel)</label>
            <input type="number" min={0} value={form.plafondAvance}
              onChange={e => setForm(p => ({ ...p, plafondAvance: e.target.value }))}
              className="ap-input" placeholder="Laisser vide = aucune avance autorisée" />
            <small className="pay-hint">
              Montant maximum que la plateforme peut avancer si le solde de l'établissement est insuffisant.
              Une commission configurable sera prélevée.
            </small>
          </div>
        </div>
      </Drawer>

      {/* Confirmation suspension/révocation */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={confirm.action === 'suspendu' ? 'Suspendre l\'accord' : 'Révoquer l\'accord'}
          message={
            confirm.action === 'suspendu'
              ? 'L\'établissement ne pourra plus initier de nouveaux paiements via ce mode. Les transactions en cours ne sont pas affectées.'
              : 'L\'établissement n\'aura plus accès à ce mode de paiement. Cette action peut être annulée en réaccordant l\'accès.'
          }
          confirmLabel={confirm.action === 'suspendu' ? 'Suspendre' : 'Révoquer'}
          variant="danger"
          busy={busy}
          onConfirm={() => changerStatut(confirm.action, confirm.accord)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
