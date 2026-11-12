/**
 * Page : Modes de paiement (super admin)
 * Route : /admin/paiements/modes-paiement
 *
 * Liste tous les modes par agrégateur (Mobile Money, Carte, Banque).
 * Permet de créer, modifier, activer/désactiver chaque mode.
 * Un mode inactif ne peut pas être accordé à un établissement.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, CreditCard, Smartphone, Building2 } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import Drawer from '../../../components/administration/Drawer'
import Switch from '../../../components/administration/Switch'
import { Flash, useFlash } from '../../../components/administration/Flash'
import { SkeletonList } from '../../../components/administration/Skeleton'
import { modePaiementService, paiementAdminService } from '../../../services/paiements/paiement.service'
import { STATUT_MODE, TYPE_LABELS, SENS_LABELS, DEVISES } from '../../../config/paiements/config'
import '../admin.css'
import './paiements.css'

const TABS_SENS = [
  { id: 'tous', label: 'Tous' },
  { id: 'entree', label: 'Encaissement' },
  { id: 'sortie', label: 'Décaissement' },
]

const TABS_TYPE = [
  { id: 'tous', label: 'Tous' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'carte', label: 'Carte' },
  { id: 'banque', label: 'Banque' },
]

const TYPE_ICONS = {
  mobile_money: Smartphone,
  carte: CreditCard,
  banque: Building2,
}

function StatutBadge({ statut }) {
  const cfg = STATUT_MODE[statut] ?? { label: statut, tone: 'neutral' }
  return <span className={`ap-badge ap-badge--${cfg.tone}`}>{cfg.label}</span>
}

function SensBadge({ sens }) {
  return (
    <span className={`ap-badge ap-badge--${sens === 'entree' ? 'info' : 'warning'}`}>
      {sens === 'entree'
        ? <><ArrowDownCircle size={11} style={{ marginRight: 4 }} />Encaissement</>
        : <><ArrowUpCircle size={11} style={{ marginRight: 4 }} />Décaissement</>
      }
    </span>
  )
}

const VIDE_FORM = {
  agregateurCode: 'fedapay',
  code: '',
  libelle: '',
  pays: 'BJ',
  operateur: '',
  type: 'mobile_money',
  sens: 'entree',
  devise: 'XOF',
  montantMin: '',
  montantMax: '',
  fraisTaux: '0',
  fraisFixe: '0',
  delaiReglementHeures: '0',
  redirection: false,
}

export default function PaiementsModesPage() {
  const notify = useNotify()
  const [flash, showFlash] = useFlash()
  const [items, setItems] = useState(null)
  const [agregateurs, setAgregateurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sensFiltrer, setSensFiltrer] = useState('tous')
  const [typeFiltrer, setTypeFiltrer] = useState('tous')
  const [q, setQ] = useState('')
  const [drawer, setDrawer] = useState(null) // { mode: 'create' | 'edit', item? }
  const [form, setForm] = useState(VIDE_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [modes, stats] = await Promise.all([
        modePaiementService.lister(),
        paiementAdminService.stats(),
      ])
      const liste = Array.isArray(modes) ? modes : modes?.modes_paiement ?? modes?.data ?? []
      setItems(liste)
      const ags = stats?.agregateurs ?? []
      setAgregateurs(ags)
    } catch (err) {
      notify.fromError(err)
      setItems(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    if (!items) return []
    const qn = q.trim().toLowerCase()
    return items
      .filter(m => sensFiltrer === 'tous' || m.sens === sensFiltrer)
      .filter(m => typeFiltrer === 'tous' || m.type === typeFiltrer)
      .filter(m => !qn || m.libelle?.toLowerCase().includes(qn) || m.code?.toLowerCase().includes(qn) || m.agregateur_code?.toLowerCase().includes(qn))
      .sort((a, b) => a.agregateur_code.localeCompare(b.agregateur_code) || a.libelle.localeCompare(b.libelle, 'fr'))
  }, [items, sensFiltrer, typeFiltrer, q])

  const counts = useMemo(() => {
    if (!items) return { tous: 0, entree: 0, sortie: 0 }
    return { tous: items.length, entree: items.filter(m => m.sens === 'entree').length, sortie: items.filter(m => m.sens === 'sortie').length }
  }, [items])

  function ouvrirCreer() {
    setForm(VIDE_FORM)
    setDrawer({ mode: 'create' })
  }

  function ouvrirEditer(item) {
    setForm({
      agregateurCode: item.agregateur_code,
      code: item.code,
      libelle: item.libelle,
      pays: item.pays,
      operateur: item.operateur,
      type: item.type,
      sens: item.sens,
      devise: item.devise,
      montantMin: item.montant_min,
      montantMax: item.montant_max ?? '',
      fraisTaux: item.frais_taux,
      fraisFixe: item.frais_fixe,
      delaiReglementHeures: item.delai_reglement_heures,
      redirection: item.redirection,
    })
    setDrawer({ mode: 'edit', item })
  }

  async function basculerStatut(item) {
    const nouveau = item.statut === 'actif' ? 'inactif' : 'actif'
    setBusy(true)
    try {
      await modePaiementService.modifier(item.uuid, { statut: nouveau })
      showFlash(`${item.libelle} est ${nouveau === 'actif' ? 'actif' : 'inactif'}.`)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function enregistrer() {
    if (!form.libelle.trim() || !form.montantMin) {
      notify.error('Données manquantes', 'Libellé et montant minimum sont obligatoires.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        ...form,
        montantMin: Number(form.montantMin),
        montantMax: form.montantMax ? Number(form.montantMax) : null,
        fraisTaux: parseFloat(form.fraisTaux) || 0,
        fraisFixe: Number(form.fraisFixe) || 0,
        delaiReglementHeures: Number(form.delaiReglementHeures) || 0,
        redirection: !!form.redirection,
      }
      if (drawer.mode === 'create') {
        await modePaiementService.creer(payload)
        notify.success('Mode créé', `${form.libelle} a été ajouté.`)
      } else {
        const { agregateurCode: _, code: __, sens: ___, type: ____, pays: _____, operateur: ______, devise: _______, ...update } = payload
        await modePaiementService.modifier(drawer.item.uuid, update)
        showFlash(`${form.libelle} mis à jour.`)
      }
      setDrawer(null)
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Modes de paiement</h2>
          <p className="ap-page-sub">Encaissements et décaissements disponibles par agrégateur</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
            Actualiser
          </button>
          <button type="button" className="ap-btn" onClick={ouvrirCreer}>
            <Plus size={16} />
            Nouveau mode
          </button>
        </div>
      </div>

      <Flash flash={flash} />

      {/* Filtres */}
      <div className="ap-filters" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS_SENS.map(t => (
            <button key={t.id} type="button" className={`ap-tab${sensFiltrer === t.id ? ' is-active' : ''}`}
              onClick={() => setSensFiltrer(t.id)}>
              {t.label}<span>{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS_TYPE.map(t => (
            <button key={t.id} type="button" className={`ap-tab${typeFiltrer === t.id ? ' is-active' : ''}`}
              onClick={() => setTypeFiltrer(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="etab-search" style={{ marginLeft: 'auto' }}>
          <Search size={15} />
          <input type="search" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} aria-label="Rechercher un mode" />
        </div>
      </div>

      {/* Tableau */}
      <div className="ap-card ap-card--flush">
        {items === null ? <SkeletonList rows={6} /> : rows.length === 0 ? (
          <div className="ap-empty">
            <CreditCard size={36} />
            <p>Aucun mode de paiement ne correspond à votre recherche.</p>
            <button type="button" className="ap-btn" onClick={ouvrirCreer}><Plus size={16} /> Créer un mode</button>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Agrégateur</th>
                  <th>Type</th>
                  <th>Sens</th>
                  <th>Pays / Opérateur</th>
                  <th>Devise</th>
                  <th>Montants</th>
                  <th>Frais</th>
                  <th>Accords</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => {
                  const TypeIcon = TYPE_ICONS[m.type] ?? CreditCard
                  return (
                    <tr key={m.uuid} onClick={() => ouvrirEditer(m)}>
                      <td>
                        <strong>{m.libelle}</strong>
                        <small><span className="ap-code">{m.code}</span></small>
                      </td>
                      <td><span className="ap-code">{m.agregateur_code}</span></td>
                      <td><TypeIcon size={14} style={{ marginRight: 5 }} />{TYPE_LABELS[m.type] ?? m.type}</td>
                      <td><SensBadge sens={m.sens} /></td>
                      <td>{m.pays} · {m.operateur}</td>
                      <td><span className="ap-code">{m.devise}</span></td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          Min: {Number(m.montant_min).toLocaleString('fr-FR')}
                          {m.montant_max ? ` — Max: ${Number(m.montant_max).toLocaleString('fr-FR')}` : ''}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {parseFloat(m.frais_taux) > 0 ? `${parseFloat(m.frais_taux)}%` : ''}
                        {Number(m.frais_fixe) > 0 ? ` + ${Number(m.frais_fixe).toLocaleString('fr-FR')}` : ''}
                        {!parseFloat(m.frais_taux) && !Number(m.frais_fixe) ? '—' : ''}
                      </td>
                      <td>
                        <span className="ap-badge ap-badge--info">{m.nb_accords_actifs ?? 0} actifs</span>
                      </td>
                      <td><StatutBadge statut={m.statut} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={m.statut === 'actif'}
                          onChange={() => basculerStatut(m)}
                          label={`${m.statut === 'actif' ? 'Désactiver' : 'Activer'} ${m.libelle}`}
                          busy={busy}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer formulaire */}
      <Drawer
        open={!!drawer}
        title={drawer?.mode === 'create' ? 'Nouveau mode de paiement' : `Modifier ${drawer?.item?.libelle ?? ''}`}
        subtitle={drawer?.mode === 'create' ? 'Définissez les paramètres du mode' : `Code : ${drawer?.item?.code ?? ''}`}
        onClose={() => !busy && setDrawer(null)}
        busy={busy}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setDrawer(null)} disabled={busy}>Annuler</button>
            <button type="button" className="ap-btn" onClick={enregistrer} disabled={busy}>
              {busy ? 'Enregistrement…' : drawer?.mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="pay-form">
          {drawer?.mode === 'create' && (
            <>
              <div className="pay-field">
                <label>Agrégateur <span className="pay-req">*</span></label>
                <select value={form.agregateurCode} onChange={e => f('agregateurCode', e.target.value)} className="ap-input">
                  <option value="fedapay">FedaPay</option>
                  <option value="kkiapay">Kkiapay</option>
                  <option value="cinetpay">CinetPay</option>
                </select>
              </div>
              <div className="pay-field-row">
                <div className="pay-field">
                  <label>Code unique <span className="pay-req">*</span></label>
                  <input type="text" value={form.code} onChange={e => f('code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="ex: fedapay_mtn_bj" className="ap-input" data-autofocus />
                </div>
                <div className="pay-field">
                  <label>Devise <span className="pay-req">*</span></label>
                  <select value={form.devise} onChange={e => f('devise', e.target.value)} className="ap-input">
                    {DEVISES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="pay-field">
            <label>Libellé <span className="pay-req">*</span></label>
            <input type="text" value={form.libelle} onChange={e => f('libelle', e.target.value)}
              placeholder="ex: MTN Mobile Money (Bénin)" className="ap-input" />
          </div>

          {drawer?.mode === 'create' && (
            <div className="pay-field-row">
              <div className="pay-field">
                <label>Type <span className="pay-req">*</span></label>
                <select value={form.type} onChange={e => f('type', e.target.value)} className="ap-input">
                  <option value="mobile_money">Mobile Money</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="banque">Virement bancaire</option>
                </select>
              </div>
              <div className="pay-field">
                <label>Sens <span className="pay-req">*</span></label>
                <select value={form.sens} onChange={e => f('sens', e.target.value)} className="ap-input">
                  <option value="entree">Encaissement (payin)</option>
                  <option value="sortie">Décaissement (payout)</option>
                </select>
              </div>
            </div>
          )}

          {drawer?.mode === 'create' && (
            <div className="pay-field-row">
              <div className="pay-field">
                <label>Pays (ISO)</label>
                <input type="text" value={form.pays} maxLength={2} onChange={e => f('pays', e.target.value.toUpperCase())} className="ap-input" placeholder="BJ" />
              </div>
              <div className="pay-field">
                <label>Opérateur</label>
                <input type="text" value={form.operateur} onChange={e => f('operateur', e.target.value)} className="ap-input" placeholder="MTN" />
              </div>
            </div>
          )}

          <div className="pay-field-row">
            <div className="pay-field">
              <label>Montant minimum <span className="pay-req">*</span></label>
              <input type="number" min={1} value={form.montantMin} onChange={e => f('montantMin', e.target.value)} className="ap-input" />
            </div>
            <div className="pay-field">
              <label>Montant maximum</label>
              <input type="number" min={1} value={form.montantMax} onChange={e => f('montantMax', e.target.value)} className="ap-input" placeholder="Illimité" />
            </div>
          </div>

          <div className="pay-field-row">
            <div className="pay-field">
              <label>Taux de frais (%)</label>
              <input type="number" min={0} max={100} step={0.01} value={form.fraisTaux} onChange={e => f('fraisTaux', e.target.value)} className="ap-input" />
            </div>
            <div className="pay-field">
              <label>Frais fixe (unités)</label>
              <input type="number" min={0} value={form.fraisFixe} onChange={e => f('fraisFixe', e.target.value)} className="ap-input" />
            </div>
          </div>

          <div className="pay-field-row">
            <div className="pay-field">
              <label>Délai règlement (heures)</label>
              <input type="number" min={0} value={form.delaiReglementHeures} onChange={e => f('delaiReglementHeures', e.target.value)} className="ap-input" />
              <small className="pay-hint">0 = immédiat · 72 = 3 jours (cartes bancaires)</small>
            </div>
            <div className="pay-field pay-field--center">
              <label>Redirection requise</label>
              <Switch
                checked={!!form.redirection}
                onChange={v => f('redirection', v)}
                label="Redirection vers la page de paiement"
              />
              <small className="pay-hint">Activer si le paiement requiert une redirection (CinetPay, FedaPay checkout)</small>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
