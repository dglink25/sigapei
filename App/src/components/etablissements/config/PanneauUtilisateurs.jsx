/**
 * PanneauUtilisateurs — Gestion des utilisateurs de l'établissement.
 * Accessible depuis Configuration > section "utilisateurs" (admin établissement).
 *
 * L'admin peut :
 *   - Lister les utilisateurs de son établissement
 *   - Créer un utilisateur
 *   - Assigner / changer un rôle
 *   - Bloquer / débloquer un compte
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, X, RefreshCw, Search, Users } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { utilisateursService } from '../../../services/identite/utilisateurs.service'
import ChampTelephone from '../../commun/ChampTelephone'

const STATUT_BADGE = { actif:'ap-badge--success', bloque:'ap-badge--warning', archive:'ap-badge--neutral' }
const STATUT_LABEL = { actif:'Actif', bloque:'Bloqué', archive:'Archivé' }

export default function PanneauUtilisateurs() {
  const notify = useNotify()

  const [utilisateurs, setUtilisateurs] = useState(null)
  const [roles,        setRoles]        = useState([])
  const [charge,       setCharge]       = useState(false)
  const [q,            setQ]            = useState('')
  const [modale,       setModale]       = useState(false)
  const [busy,         setBusy]         = useState(false)
  const [form,         setForm]         = useState({ nomComplet:'', email:'', telephone:'', roleUuid:'' })
  const [erreurs,      setErreurs]      = useState({})
  const [assignation,  setAssignation]  = useState(null)
  const [roleChoisi,   setRoleChoisi]   = useState('')

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const [rU, rR] = await Promise.all([
        utilisateursService.lister({ q: q || undefined }),
        utilisateursService.listerRoles(),
      ])
      setUtilisateurs(rU?.data?.utilisateurs ?? rU?.utilisateurs ?? [])
      setRoles((rR?.data?.roles ?? rR?.roles ?? []).filter((r) => r.code !== 'super_admin'))
    } catch (err) {
      notify.fromError(err)
      setUtilisateurs([])
    } finally {
      setCharge(false)
    }
  }, [q, notify])

  useEffect(() => { charger() }, [charger])

  const valider = () => {
    const e = {}
    if (!form.nomComplet.trim()) e.nomComplet = 'Nom requis.'
    if (!form.roleUuid) e.roleUuid = 'Rôle requis.'
    if (!form.email && !form.telephone) e.email = 'E-mail ou téléphone requis.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettreCreation = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setBusy(true)
    try {
      await utilisateursService.creer({
        nomComplet: form.nomComplet.trim(),
        email:     form.email.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        roleUuid:  form.roleUuid,
      })
      notify.success('Utilisateur créé')
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const confirmerAssignation = async () => {
    if (!assignation || !roleChoisi) return
    setBusy(true)
    try {
      await utilisateursService.assignerRole(assignation.uuid, roleChoisi)
      notify.success('Rôle assigné')
      setAssignation(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const toggleBlocage = async (u) => {
    const nouveau = u.statut === 'actif' ? 'bloque' : 'actif'
    try {
      await utilisateursService.modifierStatut(u.uuid, nouveau)
      notify.success(nouveau === 'bloque' ? 'Compte bloqué' : 'Compte réactivé')
      await charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Utilisateurs</h2>
          <p className="ap-page-sub">
            Gérez les comptes de votre établissement et assignez-leur des rôles.
            Les droits d'accès aux services se gèrent dans <strong>Droits d'accès</strong>.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'ap-spin' : ''} />
          </button>
          <button type="button" className="ap-btn ap-btn--sm"
            onClick={() => { setForm({ nomComplet:'', email:'', telephone:'', roleUuid:'' }); setErreurs({}); setModale(true) }}>
            <Plus size={14} /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="ap-filters" style={{ marginBottom: 14 }}>
        <div className="etab-search" style={{ flex:1, maxWidth:360 }}>
          <Search size={15} />
          <input placeholder="Rechercher par nom, e-mail, téléphone…" value={q}
            onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {utilisateurs === null ? (
        <div className="ap-card">
          {[0,1,2].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" /><div className="ap-skel ap-skel--line" /></div>)}
        </div>
      ) : utilisateurs.length === 0 ? (
        <div className="ap-card ap-empty">
          <Users size={36} aria-hidden="true" />
          <p>Aucun utilisateur{q ? ' pour cette recherche' : ''}.</p>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Nom</th><th>Contact</th><th>Rôle</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.uuid}>
                  <td><strong>{u.nomComplet}</strong></td>
                  <td>
                    {u.email && <div style={{ fontSize:'0.85rem' }}>{u.email}</div>}
                    {u.telephone && <div style={{ fontSize:'0.82rem', color:'var(--sg-text-muted)' }}>{u.telephone}</div>}
                  </td>
                  <td><span className="ap-badge ap-badge--info">{u.roleCode}</span></td>
                  <td>
                    <span className={`ap-badge ${STATUT_BADGE[u.statut] ?? 'ap-badge--neutral'}`}>
                      {STATUT_LABEL[u.statut] ?? u.statut}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                        onClick={() => { setAssignation(u); setRoleChoisi(roles.find((r) => r.code === u.roleCode)?.uuid ?? '') }}>
                        Changer rôle
                      </button>
                      {u.statut !== 'archive' && (
                        <button type="button" className={`ap-btn ap-btn--sm${u.statut === 'actif' ? ' ap-btn--warn' : ''}`}
                          onClick={() => toggleBlocage(u)}>
                          {u.statut === 'actif' ? 'Bloquer' : 'Débloquer'}
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

      {/* Modale création */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-uetab">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-uetab">Nouvel utilisateur</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(false)} aria-label="Fermer"><X size={16}/></button>
            </div>
            <form onSubmit={soumettreCreation}>
              <div className="cfg-modale-corps">
                <div className={`ap-field${erreurs.nomComplet ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="ue-nom">Nom complet <em>*</em></label>
                  <input id="ue-nom" className="ap-input" value={form.nomComplet}
                    onChange={(e) => setForm((f) => ({ ...f, nomComplet: e.target.value }))} />
                  {erreurs.nomComplet && <p className="ap-error">{erreurs.nomComplet}</p>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className={`ap-field${erreurs.email ? ' has-error':''}`}>
                    <label className="ap-label" htmlFor="ue-email">E-mail</label>
                    <input id="ue-email" type="email" className="ap-input" value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    {erreurs.email && <p className="ap-error">{erreurs.email}</p>}
                  </div>
                  <ChampTelephone
                    id="ue-tel"
                    label="Téléphone"
                    value={form.telephone}
                    onChange={(val) => setForm((f) => ({ ...f, telephone: val ?? '' }))}
                    erreur={erreurs.telephone}
                  />
                </div>                <div className={`ap-field${erreurs.roleUuid ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="ue-role">Rôle <em>*</em></label>
                  <select id="ue-role" className="ap-input" value={form.roleUuid}
                    onChange={(e) => setForm((f) => ({ ...f, roleUuid: e.target.value }))}>
                    <option value="">-- Sélectionner --</option>
                    {roles.map((r) => <option key={r.uuid} value={r.uuid}>{r.libelle} ({r.code})</option>)}
                  </select>
                  {erreurs.roleUuid && <p className="ap-error">{erreurs.roleUuid}</p>}
                </div>
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={busy}>{busy ? 'Création…' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale assignation rôle */}
      {assignation && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true">
          <div className="cfg-modale" style={{ maxWidth:440 }}>
            <div className="cfg-modale-tete">
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:'#006B3C' }}>Changer le rôle</h3>
            </div>
            <div className="cfg-modale-corps">
              <p style={{ fontSize:'0.88rem', color:'var(--sg-text-secondary)', marginBottom:14 }}>
                Utilisateur : <strong>{assignation.nomComplet}</strong>
              </p>
              <div className="ap-field">
                <label className="ap-label" htmlFor="ae-role">Nouveau rôle</label>
                <select id="ae-role" className="ap-input" value={roleChoisi}
                  onChange={(e) => setRoleChoisi(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {roles.map((r) => <option key={r.uuid} value={r.uuid}>{r.libelle} ({r.code})</option>)}
                </select>
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setAssignation(null)}>Annuler</button>
              <button type="button" className="ap-btn" onClick={confirmerAssignation} disabled={busy || !roleChoisi}>
                {busy ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
