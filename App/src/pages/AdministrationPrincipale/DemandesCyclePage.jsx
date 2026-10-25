/**
 * DemandesCyclePage — Gestion des demandes d'extension de cycle.
 * Réservée au Super Administrateur.
 *
 * Permet d'instruire les demandes soumises par les établissements :
 *   - Lister par statut (en attente / acceptées / refusées / toutes)
 *   - Accepter avec note optionnelle
 *   - Refuser avec note obligatoire
 */
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import { demandesCycleAdminService } from '../../services/etablissements/demandesCycle.service'
import './admin.css'

const TABS = [
  { id: 'en_attente', label: 'À instruire' },
  { id: 'acceptee',   label: 'Acceptées' },
  { id: 'refusee',    label: 'Refusées' },
  { id: 'tous',       label: 'Toutes' },
]

const CYCLE_LABELS = {
  maternelle: 'Maternelle', primaire: 'Primaire',
  secondaire: 'Secondaire', universitaire: 'Universitaire',
}

const STATUT_BADGE = {
  en_attente: 'ap-badge--warning',
  acceptee:   'ap-badge--success',
  refusee:    'ap-badge--danger',
}

const STATUT_LABEL = { en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' }

export default function DemandesCyclePage() {
  const notify = useNotify()
  const [onglet,    setOnglet]    = useState('en_attente')
  const [demandes,  setDemandes]  = useState(null)
  const [charge,    setCharge]    = useState(false)
  const [cible,     setCible]     = useState(null)   // { demande, action: 'accepter'|'refuser' }
  const [note,      setNote]      = useState('')
  const [busy,      setBusy]      = useState(false)

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const r = await demandesCycleAdminService.lister(onglet)
      setDemandes(r?.data ?? r ?? [])
    } catch (err) {
      notify.fromError(err)
      setDemandes([])
    } finally {
      setCharge(false)
    }
  }, [onglet, notify])

  useEffect(() => { charger() }, [charger])

  const ouvrirAction = (demande, action) => {
    setCible({ demande, action })
    setNote('')
  }

  const confirmer = async () => {
    if (!cible) return
    if (cible.action === 'refuser' && note.trim().length < 10) {
      notify.warning('Note requise', 'Saisissez une note d\'au moins 10 caractères pour le refus.')
      return
    }
    setBusy(true)
    try {
      if (cible.action === 'accepter') {
        await demandesCycleAdminService.accepter(cible.demande.uuid, note)
        notify.success('Demande acceptée', `Le cycle ${CYCLE_LABELS[cible.demande.cycle]} a été accordé à ${cible.demande.etablissement_nom}.`)
      } else {
        await demandesCycleAdminService.refuser(cible.demande.uuid, note)
        notify.success('Demande refusée')
      }
      setCible(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Demandes d'extension de cycle</h2>
          <p className="ap-page-sub">Instruisez les demandes des établissements souhaitant proposer un nouveau cycle d'enseignement.</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
          <RefreshCw size={14} className={charge ? 'ap-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="ap-filters">
        {TABS.map((t) => (
          <button key={t.id} type="button"
            className={`ap-tab${onglet === t.id ? ' is-active' : ''}`}
            onClick={() => setOnglet(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ap-card ap-card--flush">
        {demandes === null || charge ? (
          <Loader mode="inline" label="Chargement…" />
        ) : demandes.length === 0 ? (
          <div className="ap-empty">
            <Inbox size={36} aria-hidden="true" />
            <p>Aucune demande dans cette catégorie.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Cycle demandé</th>
                  <th>Date</th>
                  <th>Motif</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((d) => (
                  <tr key={d.uuid}>
                    <td>
                      <strong>{d.etablissement_nom ?? d.etablissement?.nom ?? '—'}</strong>
                      <small>{d.etablissement_slug ?? d.etablissement?.slug ?? ''}</small>
                    </td>
                    <td><span className="ap-badge ap-badge--neutral">{CYCLE_LABELS[d.cycle] ?? d.cycle}</span></td>
                    <td>{fmt(d.created_at)}</td>
                    <td style={{ maxWidth: 260 }}>
                      <small style={{ color: 'var(--ap-muted)', display: 'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.motif || '—'}
                      </small>
                    </td>
                    <td>
                      <span className={`ap-badge ${STATUT_BADGE[d.statut] ?? 'ap-badge--neutral'}`}>
                        {STATUT_LABEL[d.statut] ?? d.statut}
                      </span>
                    </td>
                    <td>
                      {d.statut === 'en_attente' && (
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button type="button" className="ap-btn ap-btn--sm" onClick={() => ouvrirAction(d, 'accepter')}>
                            <CheckCircle2 size={13} /> Accepter
                          </button>
                          <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => ouvrirAction(d, 'refuser')}>
                            <XCircle size={13} /> Refuser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogue d'instruction */}
      {cible && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true">
          <div className="cfg-modale" style={{ maxWidth: 480 }}>
            <div className="cfg-modale-tete">
              <h3 style={{ margin:0, fontWeight:700, fontSize:'1rem', color: cible.action === 'accepter' ? '#006B3C' : '#c0392b' }}>
                {cible.action === 'accepter' ? 'Accepter la demande' : 'Refuser la demande'}
              </h3>
            </div>
            <div className="cfg-modale-corps">
              <p style={{ fontSize:'0.88rem', color:'var(--sg-text-secondary)', marginBottom:14 }}>
                Établissement : <strong>{cible.demande.etablissement_nom}</strong><br />
                Cycle : <strong>{CYCLE_LABELS[cible.demande.cycle]}</strong>
              </p>

              {cible.action === 'accepter' && cible.demande.motif && (
                <div className="ap-alert ap-alert--warning" style={{ marginBottom:14 }}>
                  <div><strong>Motif de l'établissement</strong>{cible.demande.motif}</div>
                </div>
              )}

              <div className="ap-field">
                <label className="ap-label" htmlFor="instr-note">
                  Note {cible.action === 'refuser' ? <em>*</em> : '(optionnel)'}
                </label>
                <textarea
                  id="instr-note" className="ap-textarea" rows={3}
                  placeholder={cible.action === 'refuser' ? 'Expliquez le motif du refus (obligatoire).' : 'Commentaire optionnel.'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setCible(null)} disabled={busy}>Annuler</button>
              <button
                type="button"
                className={`ap-btn${cible.action === 'refuser' ? ' ap-btn--danger' : ''}`}
                onClick={confirmer}
                disabled={busy}
              >
                {busy ? 'Traitement…' : cible.action === 'accepter' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
