/**
 * RolesPage - Gestion des rôles par le Super Administrateur.
 *
 * - Tableau des rôles système (non modifiables)
 * - CRUD rôles personnalisés avec sélecteur d'établissements visuel
 * - Pour chaque rôle personnalisé : voir les établissements assignés,
 *   assigner de nouveaux établissements, retirer (cascade utilisateurs)
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, X, RefreshCw, Lock, Trash2, Building2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import ChecklistDrawer from '../../components/administration/ChecklistDrawer'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import { rolesEtablissementsService } from '../../services/identite/rolesEtablissements.service'
import { adminService } from '../../services/etablissements/etablissement.service'
import './admin.css'
import '../../components/administration/admin-ui.css'

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
  const [etabs,       setEtabs]       = useState([])       // tous les établissements actifs
  const [charge,      setCharge]      = useState(false)
  const [modale,      setModale]      = useState(null)     // null | 'creer' | { role }
  const [supprimer,   setSupprimer]   = useState(null)
  const [busy,        setBusy]        = useState(false)
  const [form,        setForm]        = useState({ code:'', libelle:'', familleAuth:'personnel_admin', etabsChoisis:[] })
  const [rechercheEtab, setRechercheEtab] = useState('')
  const [erreurs,     setErreurs]     = useState({})

  // Détail d'un rôle déplié (établissements assignés)
  const [detailRole,  setDetailRole]  = useState(null)     // uuid du rôle déplié
  const [detailData,  setDetailData]  = useState({})       // { [roleUuid]: [...] }
  const [tiroir,      setTiroir]      = useState(null)     // { roleUuid, roleLibelle }
  const [confirmRetrait, setConfirmRetrait] = useState(null) // { assignationUuid, roleLibelle, etabNom }

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const [rRoles, rEtabs] = await Promise.all([
        utilisateursService.listerRoles(),
        adminService.listerEtablissements(),
      ])
      setRoles(rRoles?.data?.roles ?? rRoles?.roles ?? [])
      setEtabs((Array.isArray(rEtabs) ? rEtabs : rEtabs?.etablissements ?? []).filter((e) => e.statut === 'actif'))
    } catch (err) {
      notify.fromError(err)
      setRoles([])
    } finally {
      setCharge(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  // Charger les établissements d'un rôle à la demande
  const chargerDetailRole = async (roleUuid) => {
    try {
      const r = await rolesEtablissementsService.etablissementsParRole(roleUuid)
      // Normaliser : peut être un tableau direct, { data: [...] }, ou { data: { data: [...] } }
      let liste = r
      if (!Array.isArray(liste)) liste = r?.data ?? r
      if (!Array.isArray(liste)) liste = []
      setDetailData((d) => ({ ...d, [roleUuid]: liste }))
    } catch {
      setDetailData((d) => ({ ...d, [roleUuid]: [] }))
    }
  }

  const toggleDetail = async (roleUuid) => {
    if (detailRole === roleUuid) { setDetailRole(null); return }
    setDetailRole(roleUuid)
    if (!detailData[roleUuid]) await chargerDetailRole(roleUuid)
  }

  // Créer / modifier un rôle
  const ouvrirCreer = () => {
    setForm({ code:'', libelle:'', familleAuth:'personnel_admin', etabsChoisis:[] })
    setRechercheEtab('')
    setErreurs({})
    setModale('creer')
  }
  const ouvrirModifier = (role) => {
    setForm({ code:role.code, libelle:role.libelle, familleAuth:role.familleAuth, etabsChoisis:[] })
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
      let roleUuid
      if (modale === 'creer') {
        const r = await utilisateursService.creerRole({
          code: form.code.trim(),
          libelle: form.libelle.trim(),
          familleAuth: form.familleAuth,
          // pas de tenantId : rôle global assignable à plusieurs établissements
        })
        roleUuid = r?.data?.uuid ?? r?.uuid
        notify.success('Rôle créé', form.code)

        // Assigner aux établissements sélectionnés
        if (form.etabsChoisis.length > 0 && roleUuid) {
          await rolesEtablissementsService.assigner(roleUuid, form.etabsChoisis)
        }
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

  // Assigner un rôle à de nouveaux établissements
  const assignerEtablissements = async (etabUuids) => {
    if (!tiroir) return
    setBusy(true)
    try {
      await rolesEtablissementsService.assigner(tiroir.roleUuid, etabUuids)
      notify.success('Rôle assigné', `${tiroir.roleLibelle} assigné à ${etabUuids.length} établissement(s).`)
      setTiroir(null)
      await chargerDetailRole(tiroir.roleUuid)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  // Retirer un rôle d'un établissement (avec cascade utilisateurs)
  const retirerRole = async () => {
    if (!confirmRetrait) return
    setBusy(true)
    try {
      await rolesEtablissementsService.retirer(confirmRetrait.assignationUuid)
      notify.success('Rôle retiré', `Les utilisateurs concernés ont été réattribués au rôle Personnel.`)
      setConfirmRetrait(null)
      await chargerDetailRole(confirmRetrait.roleUuid)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const systemes  = roles?.filter((r) => !r.estPersonnalise) ?? []
  const perso     = roles?.filter((r) => r.estPersonnalise)  ?? []

  const etabsFiltres = etabs.filter((e) =>
    !rechercheEtab || e.nom?.toLowerCase().includes(rechercheEtab.toLowerCase()),
  )
  const dejaAssignesRole = new Set(
    detailRole ? (detailData[detailRole] ?? []).map((x) => x.etablissementUuid) : [],
  )
  const itemsTiroir = etabs
    .filter((e) => !dejaAssignesRole.has(e.uuid))
    .map((e) => ({ id: e.uuid, title: e.nom, subtitle: e.slug ?? e.code }))

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Rôles</h2>
          <p className="ap-page-sub">
            Rôles système (non modifiables) et rôles personnalisés assignables aux établissements.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'ap-spin' : ''} />
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
          {/* Rôles système */}
          <h3 style={{ marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles système
          </h3>
          <div className="ap-card ap-card--flush" style={{ marginBottom:28 }}>
            <table className="ap-table">
              <thead><tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Portée</th></tr></thead>
              <tbody>
                {systemes.map((r) => (
                  <tr key={r.uuid} style={{ cursor:'default' }}>
                    <td><span className="ap-code">{r.code}</span></td>
                    <td>{r.libelle}</td>
                    <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                    <td style={{ display:'flex', alignItems:'center', gap:5, color:'var(--ap-muted)', fontSize:'0.82rem' }}>
                      <Lock size={12} /> Système
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rôles personnalisés */}
          <h3 style={{ marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles personnalisés
          </h3>
          {perso.length === 0 ? (
            <div className="ap-card ap-empty">
              <p>Aucun rôle personnalisé.</p>
              <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}><Plus size={14} /> Créer</button>
            </div>
          ) : (
            <div className="ap-card ap-card--flush">
              <table className="ap-table">
                <thead>
                  <tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Établissements</th><th></th></tr>
                </thead>
                <tbody>
                  {perso.map((r) => (
                    <>
                      <tr key={r.uuid}>
                        <td><span className="ap-code">{r.code}</span></td>
                        <td>{r.libelle}</td>
                        <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                        <td>
                          <button type="button"
                            style={{ background:'none', border:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--ap-green)', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600, padding:'2px 0' }}
                            onClick={() => toggleDetail(r.uuid)}>
                            <Building2 size={14} aria-hidden="true" />
                            Voir les établissements
                            {detailRole === r.uuid ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => ouvrirModifier(r)}>Modifier</button>
                            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => setSupprimer(r)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>

                      {/* Ligne dépliable : établissements du rôle */}
                      {detailRole === r.uuid && (
                        <tr key={`${r.uuid}-detail`}>
                          <td colSpan={5} style={{ padding:0, background:'rgba(0,107,60,0.03)' }}>
                            <div style={{ padding:'12px 18px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                                <strong style={{ fontSize:'0.88rem' }}>Établissements ayant accès à « {r.libelle} »</strong>
                                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                                  onClick={() => setTiroir({ roleUuid: r.uuid, roleLibelle: r.libelle })}>
                                  <Plus size={13} /> Assigner à des établissements
                                </button>
                              </div>
                              {!detailData[r.uuid] ? (
                                <Loader mode="inline" label="Chargement…" />
                              ) : detailData[r.uuid].length === 0 ? (
                                <p style={{ color:'var(--ap-muted)', fontSize:'0.85rem', margin:0 }}>
                                  Aucun établissement pour ce rôle.
                                </p>
                              ) : (
                                <table className="ap-table" style={{ marginBottom:0 }}>
                                  <thead><tr><th>Établissement</th><th>Slug</th><th></th></tr></thead>
                                  <tbody>
                                    {detailData[r.uuid].map((a) => (
                                      <tr key={a.uuid}>
                                        <td><strong>{a.etablissementNom}</strong></td>
                                        <td><span className="ap-code">{a.etablissementSlug}</span></td>
                                        <td>
                                          <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                                            onClick={() => setConfirmRetrait({ assignationUuid: a.uuid, roleUuid: r.uuid, roleLibelle: r.libelle, etabNom: a.etablissementNom })}
                                            aria-label="Retirer">
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
          <div className="cfg-modale" style={{ maxWidth: 580 }}>
            <div className="cfg-modale-tete">
              <h3 id="m-role">{modale === 'creer' ? 'Nouveau rôle personnalisé' : `Modifier · ${modale.role.code}`}</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(null)} aria-label="Fermer"><X size={16}/></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                {modale === 'creer' && (
                  <div className={`ap-field${erreurs.code ? ' has-error':''}`}>
                    <label className="ap-label" htmlFor="r-code">Code <em>*</em></label>
                    <input id="r-code" className="ap-input ap-input--mono"
                      value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'') }))}
                      placeholder="ex. secretaire" />
                    <p className="ap-hint">Minuscules, chiffres, tirets. Immuable après création.</p>
                    {erreurs.code && <p className="ap-error">{erreurs.code}</p>}
                  </div>
                )}
                <div className={`ap-field${erreurs.libelle ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="r-libelle">Libellé <em>*</em></label>
                  <input id="r-libelle" className="ap-input" value={form.libelle}
                    onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} placeholder="Ex. Secrétaire" />
                  {erreurs.libelle && <p className="ap-error">{erreurs.libelle}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label">Famille d'authentification</label>
                  <div style={{ display:'flex', gap:12 }}>
                    {FAMILLE_OPTIONS.map((o) => (
                      <label key={o.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.88rem', fontWeight: form.familleAuth === o.id ? 700 : 400 }}>
                        <input type="radio" name="fa" value={o.id} checked={form.familleAuth === o.id} onChange={() => setForm((f) => ({ ...f, familleAuth: o.id }))} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sélection des établissements (création uniquement) */}
                {modale === 'creer' && (
                  <div className="ap-field">
                    <label className="ap-label">Établissements (optionnel)</label>
                    <p className="ap-hint" style={{ marginBottom:8 }}>Sélectionnez les établissements qui auront accès à ce rôle.</p>
                    <div className="ap-search" style={{ marginBottom:8 }}>
                      <Search size={15} />
                      <input className="ap-input" placeholder="Rechercher…" value={rechercheEtab}
                        onChange={(e) => setRechercheEtab(e.target.value)} />
                    </div>
                    <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid var(--sg-border)', borderRadius:8 }}>
                      {etabsFiltres.length === 0 ? (
                        <p style={{ padding:'10px 14px', color:'var(--sg-text-muted)', fontSize:'0.85rem', margin:0 }}>Aucun établissement actif.</p>
                      ) : etabsFiltres.map((e, i) => {
                        const checked = form.etabsChoisis.includes(e.uuid)
                        return (
                          <label key={e.uuid}
                            className={`ap-check-row${checked ? ' is-on' : ''}`}
                            style={{ '--i':i, borderRadius:0, border:'none', borderBottom:'1px solid var(--sg-border)' }}>
                            <input type="checkbox" className="ap-check" checked={checked}
                              onChange={() => setForm((f) => ({
                                ...f,
                                etabsChoisis: checked
                                  ? f.etabsChoisis.filter((u) => u !== e.uuid)
                                  : [...f.etabsChoisis, e.uuid],
                              }))} />
                            <div className="ap-check-info">
                              <strong>{e.nom}</strong>
                              <small>{e.slug ?? e.code}</small>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    {form.etabsChoisis.length > 0 && (
                      <p className="ap-hint">{form.etabsChoisis.length} établissement(s) sélectionné(s)</p>
                    )}
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

      {/* Tiroir assignation établissements */}
      <ChecklistDrawer
        open={!!tiroir}
        title={`Assigner « ${tiroir?.roleLibelle ?? ''} » à des établissements`}
        subtitle="Sélectionnez les établissements qui auront accès à ce rôle."
        items={itemsTiroir}
        loading={false}
        max={200}
        busy={busy}
        submitLabel="Assigner"
        searchPlaceholder="Rechercher un établissement…"
        emptyLabel="Tous les établissements actifs ont déjà accès à ce rôle."
        onSubmit={assignerEtablissements}
        onClose={() => setTiroir(null)}
      />

      {/* Confirmation suppression rôle */}
      <ConfirmDialog
        open={!!supprimer}
        tone="danger"
        title={`Supprimer « ${supprimer?.code} » ?`}
        message="Le rôle sera supprimé définitivement. Impossible s'il est encore utilisé par des comptes actifs."
        confirmLabel="Supprimer"
        loading={busy}
        onConfirm={confirmerSuppression}
        onCancel={() => setSupprimer(null)}
      />

      {/* Confirmation retrait rôle d'un établissement */}
      <ConfirmDialog
        open={!!confirmRetrait}
        tone="danger"
        title="Retirer ce rôle de l'établissement ?"
        message={`« ${confirmRetrait?.roleLibelle ?? ''} » sera retiré de ${confirmRetrait?.etabNom ?? 'cet établissement'}. Les utilisateurs qui avaient ce rôle seront réattribués au rôle Personnel.`}
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={retirerRole}
        onCancel={() => setConfirmRetrait(null)}
      />
    </div>
  )
}
