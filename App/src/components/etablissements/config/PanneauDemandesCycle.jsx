/**
 * PanneauDemandesCycle - Demandes d'extension de cycle.
 *
 * Accessible depuis Configuration > section "demandes-cycle".
 * L'administrateur peut :
 *   - Voir ses demandes en cours / acceptées / refusées
 *   - Soumettre une nouvelle demande pour un cycle non encore autorisé
 *   - Annuler une demande en attente
 */
import { useEffect, useState } from 'react'
import { Plus, X, RefreshCw, AlertTriangle } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { tokenStore, decodeJwt } from '../../../lib/identite/tokenStore'
import { demandesCycleEtabService } from '../../../services/etablissements/demandesCycle.service'
import { monEtablissementService }  from '../../../services/etablissements/monEtablissement.service'

// Clé localStorage : une par tenant pour que chaque établissement ait son propre état
const cleAlerte = () => {
  const payload  = decodeJwt(tokenStore.getAccess() ?? '')
  const tenantId = payload?.tenantId ?? payload?.tenant_id ?? 'default'
  return `sigapei.alerte_cycles_ferme.${tenantId}`
}

const lireAlerteFermee = () => {
  try { return localStorage.getItem(cleAlerte()) === '1' }
  catch { return false }
}

const persisterAlerteFermee = () => {
  try { localStorage.setItem(cleAlerte(), '1') } catch { /* ignore */ }
}

const CYCLES_DISPO = [
  { id: 'maternelle',    label: 'Maternelle',   desc: 'Petite, moyenne et grande section' },
  { id: 'primaire',      label: 'Primaire',      desc: 'CI, CP, CE1, CE2, CM1, CM2' },
  { id: 'secondaire',    label: 'Secondaire',    desc: 'Collège et lycée' },
  { id: 'universitaire', label: 'Universitaire', desc: 'Licence, Master, Doctorat…' },
]

const STATUT_BADGE = {
  en_attente: 'ap-badge--warning',
  acceptee:   'ap-badge--success',
  refusee:    'ap-badge--danger',
}
const STATUT_LABEL = {
  en_attente: 'En attente',
  acceptee:   'Acceptée',
  refusee:    'Refusée',
}

export default function PanneauDemandesCycle() {
  const notify = useNotify()
  const [demandes,       setDemandes]       = useState([])
  const [cyclesAutorises,setCyclesAutorises]= useState([]) // cycles déjà accordés
  const [charge,         setCharge]         = useState(true)
  const [modale,         setModale]         = useState(false)
  const [enCours,        setEnCours]        = useState(false)
  const [form,           setForm]           = useState({ cycle: '', motif: '' })
  const [erreurs,        setErreurs]        = useState({})
  const [showAlert,      setShowAlert]      = useState(() => !lireAlerteFermee())

  const fermerAlerte = () => {
    persisterAlerteFermee()
    setShowAlert(false)
  }

  const charger = async () => {
    setCharge(true)
    try {
      const [rDemandes, rProfil] = await Promise.all([
        demandesCycleEtabService.lister(),
        monEtablissementService.lire(),
      ])
      setDemandes(rDemandes?.data ?? rDemandes ?? [])
      // cyclesAutorises : [{ cycle: 'primaire', statut: 'actif' }, …]
      setCyclesAutorises(
        (rProfil?.cyclesAutorises ?? [])
          .filter((c) => c.statut === 'actif')
          .map((c) => c.cycle)
      )
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  // Cycles déjà en demande en attente → désactivés dans le formulaire
  const cyclesEnAttente = demandes
    .filter((d) => d.statut === 'en_attente')
    .map((d) => d.cycle)

  // Un cycle est indisponible s'il est déjà autorisé OU en attente de validation
  const cycleIndisponible = (id) =>
    cyclesAutorises.includes(id) || cyclesEnAttente.includes(id)

  const raisonIndisponible = (id) => {
    if (cyclesAutorises.includes(id)) return 'Déjà autorisé pour votre établissement'
    if (cyclesEnAttente.includes(id)) return 'Demande déjà en cours d\'instruction'
    return null
  }

  const valider = () => {
    const e = {}
    if (!form.cycle) e.cycle = 'Sélectionnez un cycle.'
    if (form.motif.trim().length < 20) e.motif = 'Décrivez votre besoin (20 caractères minimum).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await demandesCycleEtabService.soumettre({
        cycle: form.cycle,
        motif: form.motif.trim(),
      })
      notify.success('Demande envoyée', 'Le Super Administrateur va l\'instruire.')
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const annuler = async (uuid) => {
    try {
      await demandesCycleEtabService.annuler(uuid)
      notify.success('Demande annulée')
      await charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '-'

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Demandes d'extension de cycle</h2>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'ap-spin' : ''} />
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={() => { setForm({ cycle:'', motif:'' }); setErreurs({}); setModale(true) }}>
            <Plus size={14} /> Nouvelle demande
          </button>
        </div>
      </div>

      {showAlert && (
        <div
          className="ap-alert ap-alert--warning"
          style={{
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <strong>Cycles autorisés uniquement</strong>
            <div>
              Seuls les cycles accordés lors de la validation de votre établissement ou suite à une
              demande acceptée sont disponibles dans la configuration académique.
            </div>
          </div>
          <button
            type="button"
            onClick={fermerAlerte}
            aria-label="Fermer l'alerte"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {charge ? (
        <div className="ap-card">
          {[0,1].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
        </div>
      ) : demandes.length === 0 ? (
        <div className="ap-card ap-empty">
          <Plus size={36} aria-hidden="true" />
          <p>Aucune demande. Cliquez sur <strong>Nouvelle demande</strong> pour en soumettre une.</p>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Cycle demandé</th><th>Date</th><th>Statut</th><th>Note</th><th></th></tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.uuid}>
                  <td><strong>{CYCLES_DISPO.find((c) => c.id === d.cycle)?.label ?? d.cycle}</strong></td>
                  <td>{fmt(d.created_at)}</td>
                  <td><span className={`ap-badge ${STATUT_BADGE[d.statut] ?? 'ap-badge--neutral'}`}>{STATUT_LABEL[d.statut] ?? d.statut}</span></td>
                  <td>
                    {d.note_instruction
                      ? <small style={{ color: 'var(--sg-text-secondary)' }}>{d.note_instruction}</small>
                      : <span style={{ color: 'var(--sg-text-muted)' }}>-</span>
                    }
                  </td>
                  <td>
                    {d.statut === 'en_attente' && (
                      <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => annuler(d.uuid)}>
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-dc">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-dc">Demande d'extension de cycle</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <p className="ap-hint" style={{ marginBottom: 16 }}>
                  Votre demande sera examinée par le Super Administrateur. Un motif détaillé augmente les chances d'acceptation.
                </p>
                <div className={`ap-field${erreurs.cycle ? ' has-error' : ''}`}>
                  <label className="ap-label">Cycle souhaité <em>*</em></label>
                  <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                    {CYCLES_DISPO.map(({ id, label, desc }) => {
                      const indisponible = cycleIndisponible(id)
                      const raison       = raisonIndisponible(id)
                      return (
                        <label key={id} className={`ap-check-row${form.cycle === id ? ' is-on' : ''}${indisponible ? ' is-disabled' : ''}`}
                          style={{ cursor: indisponible ? 'not-allowed' : 'pointer' }}>
                          <input
                            type="radio" name="cycle" value={id}
                            checked={form.cycle === id}
                            disabled={indisponible}
                            onChange={() => setForm((f) => ({ ...f, cycle: id }))}
                            style={{ position:'absolute', opacity:0 }}
                          />
                          <div className="ap-check-info">
                            <strong>{label}</strong>
                            <small>{raison ?? desc}</small>
                          </div>
                          {cyclesAutorises.includes(id) && (
                            <span className="ap-badge ap-badge--success" style={{ marginLeft:'auto', flexShrink:0 }}>
                              Autorisé
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  {erreurs.cycle && <p className="ap-error">{erreurs.cycle}</p>}
                </div>
                <div className={`ap-field${erreurs.motif ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="dc-motif">Motif / justification <em>*</em></label>
                  <textarea
                    id="dc-motif" className="ap-textarea" rows={4}
                    placeholder="Expliquez pourquoi votre établissement a besoin de ce cycle (minimum 20 caractères)."
                    value={form.motif}
                    onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
                  />
                  <p className="ap-hint">{form.motif.length} / 1000 caractères</p>
                  {erreurs.motif && <p className="ap-error">{erreurs.motif}</p>}
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={enCours}>
                  {enCours ? 'Envoi…' : 'Soumettre la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}