/**
 * RolesPage - Gestion des rôles par le Super Administrateur.
 *
 * - Lister les rôles systèmes (non modifiables, non supprimables)
 * - Créer des rôles personnalisés globaux ou pour un établissement
 * - Modifier le libellé d'un rôle personnalisé
 * - Supprimer un rôle personnalisé non utilisé
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, X, RefreshCw, Lock, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import './admin.css'

const FAMILLE_LABELS = {
  super_admin:      'Super Admin',
  personnel_admin:  'Personnel / Admin',
  parent_apprenant: 'Parent / Apprenant',
}

const FAMILLE_OPTIONS = [
  { id: 'personnel_admin',  label: 'Personnel / Admin' },
  { id: 'parent_apprenant', label: 'Parent / Apprenant' },
]

export default function RolesPage() {
  const notify = useNotify()
  const [roles,       setRoles]       = useState(null)
  const [charge,      setCharge]      = useState(false)
  const [modale,      setModale]      = useState(null)  // null | 'creer' | { role } pour modifier
  const [supprimer,   setSupprimer]   = useState(null)  // role à supprimer
  const [busy,        setBusy]        = useState(false)
  const [form,        setForm]        = useState({ code:'', libelle:'', familleAuth:'personnel_admin', tenantId:'' })
  const [erreurs,     setErreurs]     = useState({})

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const r = await utilisateursService.listerRoles()
      setRoles(r?.data?.roles ?? r?.roles ?? [])
    } catch (err) {
      notify.fromError(err)
      setRoles([])
    } finally {
      setCharge(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  const ouvrirCreer = () => {
    setForm({ code:'', libelle:'', familleAuth:'personnel_admin', tenantId:'' })
    setErreurs({})
    setModale('creer')
  }

  const ouvrirModifier = (role) => {
    setForm({ code: role.code, libelle: role.libelle, familleAuth: role.familleAuth, tenantId: role.tenantId ?? '' })
    setErreurs({})
    setModale({ role })
  }

  const valider = () => {
    const e = {}
    if (!form.code.trim()) e.code = 'Le code est requis.'
    if (!form.libelle.trim()) e.libelle = 'Le libellé est requis.'
    if (!/^[a-z0-9_-]+$/.test(form.code)) e.code = 'Code : minuscules, chiffres, tirets uniquement.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setBusy(true)
    try {
      if (modale === 'creer') {
        await utilisateursService.creerRole({
          code: form.code.trim(),
          libelle: form.libelle.trim(),
          familleAuth: form.familleAuth,
          tenantId: form.tenantId.trim() || undefined,
        })
        notify.success('Rôle créé', form.code)
      } else {
        await utilisateursService.modifierRole(modale.role.uuid, {
          libelle: form.libelle.trim(),
          familleAuth: form.familleAuth,
        })
        notify.success('Rôle mis à jour')
      }
      setModale(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const confirmerSuppression = async () => {
    if (!supprimer) return
    setBusy(true)
    try {
      await utilisateursService.supprimerRole(supprimer.uuid)
      notify.success('Rôle supprimé', supprimer.code)
      setSupprimer(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const systemes  = roles?.filter((r) => !r.estPersonnalise) ?? []
  const perso     = roles?.filter((r) => r.estPersonnalise) ?? []

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Rôles</h2>
          <p className="ap-page-sub">
            Les rôles systèmes sont créés automatiquement et ne peuvent être ni modifiés ni supprimés.
            Les rôles personnalisés sont créés par le Super Administrateur ou par un administrateur d'établissement.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'ap-spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}>
            <Plus size={14} /> Nouveau rôle
          </button>
        </div>
      </div>

      {roles === null ? (
        <Loader mode="inline" label="Chargement des rôles…" />
      ) : (
        <>
          {/* Rôles systèmes */}
          <h3 style={{ marginBottom: 10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles système (non modifiables)
          </h3>
          <div className="ap-card ap-card--flush" style={{ marginBottom: 24 }}>
            <table className="ap-table">
              <thead>
                <tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Portée</th></tr>
              </thead>
              <tbody>
                {systemes.map((r) => (
                  <tr key={r.uuid} style={{ cursor:'default' }}>
                    <td><span className="ap-code">{r.code}</span></td>
                    <td>{r.libelle}</td>
                    <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--ap-muted)', fontSize:'0.82rem' }}>
                        <Lock size={12} /> Système
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rôles personnalisés */}
          <h3 style={{ marginBottom: 10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles personnalisés
          </h3>
          {perso.length === 0 ? (
            <div className="ap-card ap-empty">
              <Plus size={32} aria-hidden="true" />
              <p>Aucun rôle personnalisé. Créez-en un pour affiner les accès.</p>
              <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}><Plus size={14} /> Créer</button>
            </div>
          ) : (
            <div className="ap-card ap-card--flush">
              <table className="ap-table">
                <thead>
                  <tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Établissement</th><th></th></tr>
                </thead>
                <tbody>
                  {perso.map((r) => (
                    <tr key={r.uuid}>
                      <td><span className="ap-code">{r.code}</span></td>
                      <td>{r.libelle}</td>
                      <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                      <td>
                        {r.tenantId
                          ? <span className="ap-code" style={{ fontSize:'0.75rem' }}>{r.tenantId.slice(0,8)}…</span>
                          : <span style={{ color:'var(--ap-muted)', fontSize:'0.82rem' }}>Global</span>}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => ouvrirModifier(r)}>
                            Modifier
                          </button>
                          <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => setSupprimer(r)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modale création / modification */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-role">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-role">{modale === 'creer' ? 'Nouveau rôle' : `Modifier · ${modale.role.code}`}</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(null)} aria-label="Fermer"><X size={16}/></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                {modale === 'creer' && (
                  <div className={`ap-field${erreurs.code ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="r-code">Code <em>*</em></label>
                    <input id="r-code" className="ap-input ap-input--mono"
                      value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'') }))}
                      placeholder="ex. agent_securite" />
                    <p className="ap-hint">Minuscules, chiffres, tirets. Immuable après création.</p>
                    {erreurs.code && <p className="ap-error">{erreurs.code}</p>}
                  </div>
                )}
                <div className={`ap-field${erreurs.libelle ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="r-libelle">Libellé <em>*</em></label>
                  <input id="r-libelle" className="ap-input" value={form.libelle}
                    onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} placeholder="Ex. Agent de sécurité" />
                  {erreurs.libelle && <p className="ap-error">{erreurs.libelle}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label" htmlFor="r-famille">Famille d'authentification</label>
                  <select id="r-famille" className="ap-input" value={form.familleAuth}
                    onChange={(e) => setForm((f) => ({ ...f, familleAuth: e.target.value }))}>
                    {FAMILLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <p className="ap-hint">Détermine le parcours de connexion (OTP email/téléphone ou biométrie matricule).</p>
                </div>
                {modale === 'creer' && (
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="r-tenant">UUID Établissement (optionnel)</label>
                    <input id="r-tenant" className="ap-input ap-input--mono" value={form.tenantId}
                      onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                      placeholder="Laisser vide pour un rôle global" />
                    <p className="ap-hint">Si renseigné, ce rôle n'est visible et assignable que par cet établissement.</p>
                  </div>
                )}
              </div>
              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(null)}>Annuler</button>
                <button type="submit" className="ap-btn" disabled={busy}>
                  {busy ? 'Enregistrement…' : modale === 'creer' ? 'Créer le rôle' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!supprimer}
        tone="danger"
        title={`Supprimer le rôle « ${supprimer?.code} » ?`}
        message="Le rôle sera supprimé définitivement. Cette action est impossible s'il est encore utilisé par des comptes actifs."
        confirmLabel="Supprimer"
        loading={busy}
        onConfirm={confirmerSuppression}
        onCancel={() => setSupprimer(null)}
      />
    </div>
  )
}
