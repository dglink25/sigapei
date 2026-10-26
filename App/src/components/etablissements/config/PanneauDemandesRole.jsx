/**
 * PanneauDemandesRole - Demandes de rôle personnalisé (admin établissement).
 * L'admin écrit le nom et la description. Le super admin instruit la demande.
 */
import { useEffect, useState } from 'react'
import { Plus, X, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { demandesRoleEtabService } from '../../../services/identite/rolesEtablissements.service'

const STATUT_BADGE = { en_attente:'ap-badge--warning', acceptee:'ap-badge--success', refusee:'ap-badge--danger' }
const STATUT_LABEL = { en_attente:'En attente', acceptee:'Acceptée', refusee:'Refusée' }

export default function PanneauDemandesRole() {
  const notify = useNotify()
  const [demandes,  setDemandes]  = useState([])
  const [charge,    setCharge]    = useState(true)
  const [modale,    setModale]    = useState(false)
  const [enCours,   setEnCours]   = useState(false)
  const [form,      setForm]      = useState({ nomSouhaite:'', description:'' })
  const [erreurs,   setErreurs]   = useState({})

  const charger = async () => {
    setCharge(true)
    try {
      const r = await demandesRoleEtabService.listerMesDemandes()
      // L'intercepteur wrappe les tableaux : { success: true, data: [...] }
      const liste = Array.isArray(r?.data) ? r.data
        : Array.isArray(r) ? r
        : []
      setDemandes(liste)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  const valider = () => {
    const e = {}
    if (!form.nomSouhaite.trim()) e.nomSouhaite = 'Le nom souhaité est requis.'
    if (form.description.trim().length < 20) e.description = 'La description doit faire au moins 20 caractères.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await demandesRoleEtabService.soumettre({
        nomSouhaite:  form.nomSouhaite.trim(),
        description:  form.description.trim(),
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
      await demandesRoleEtabService.annuler(uuid)
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
          <h2 className="ap-page-title">Demandes de rôle personnalisé</h2>
          <p className="ap-page-sub">
            Demandez la création d'un rôle spécifique à votre établissement.
            Le Super Administrateur l'instruira et vous notifiera.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'ap-spin' : ''} />
          </button>
          <button type="button" className="ap-btn ap-btn--sm"
            onClick={() => { setForm({ nomSouhaite:'', description:'' }); setErreurs({}); setModale(true) }}>
            <Plus size={14} /> Nouvelle demande
          </button>
        </div>
      </div>

      {charge ? (
        <div className="ap-card">
          {[0,1].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
        </div>
      ) : demandes.length === 0 ? (
        <div className="ap-card ap-empty">
          <Plus size={36} aria-hidden="true" />
          <p>Aucune demande. Créez-en une pour obtenir un rôle personnalisé.</p>
          <button type="button" className="ap-btn ap-btn--sm"
            onClick={() => { setForm({ nomSouhaite:'', description:'' }); setErreurs({}); setModale(true) }}>
            <Plus size={14} /> Soumettre une demande
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Nom souhaité</th><th>Date</th><th>Statut</th><th>Note</th><th></th></tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.uuid}>
                  <td>
                    <strong>{d.nomSouhaite}</strong>
                    {d.description && <small style={{ color:'var(--sg-text-muted)' }}>{d.description.slice(0,80)}{d.description.length > 80 ? '…' : ''}</small>}
                  </td>
                  <td>{fmt(d.createdAt)}</td>
                  <td><span className={`ap-badge ${STATUT_BADGE[d.statut] ?? 'ap-badge--neutral'}`}>{STATUT_LABEL[d.statut] ?? d.statut}</span></td>
                  <td>
                    {d.noteInstruction
                      ? <small style={{ color:'var(--sg-text-secondary)' }}>{d.noteInstruction}</small>
                      : <span style={{ color:'var(--sg-text-muted)' }}>-</span>}
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
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-dr">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-dr">Demande de rôle personnalisé</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16}/></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                <p className="ap-hint" style={{ marginBottom:14 }}>
                  Décrivez le rôle dont vous avez besoin. Le Super Administrateur l'examinera et vous notifiera.
                </p>
                <div className={`ap-field${erreurs.nomSouhaite ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="dr-nom">Nom du rôle souhaité <em>*</em></label>
                  <input id="dr-nom" className="ap-input" value={form.nomSouhaite}
                    onChange={(e) => setForm((f) => ({ ...f, nomSouhaite: e.target.value }))}
                    placeholder="Ex. Responsable pédagogique, Agent de sécurité…" />
                  {erreurs.nomSouhaite && <p className="ap-error">{erreurs.nomSouhaite}</p>}
                </div>
                <div className={`ap-field${erreurs.description ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="dr-desc">Description / justification <em>*</em></label>
                  <textarea id="dr-desc" className="ap-textarea" rows={4}
                    placeholder="Expliquez les responsabilités de ce rôle et pourquoi il est nécessaire (min. 20 caractères)."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  <p className="ap-hint">{form.description.length} / 1000 caractères</p>
                  {erreurs.description && <p className="ap-error">{erreurs.description}</p>}
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
