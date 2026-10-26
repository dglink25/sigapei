/**
 * RolesPage - Gestion des rôles.
 *
 * Rôles système et personnalisés :
 *   - Voir les établissements assignés à chaque rôle
 *   - Assigner / retirer un rôle à des établissements
 *
 * Rôles système uniquement : non supprimables, libellé non modifiable.
 * Rôles personnalisés : CRUD complet.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Building2, ChevronDown, ChevronUp, Lock, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
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

/**
 * Ligne dépliable commune : liste des établissements d'un rôle + boutons assigner/retirer.
 */
function DetailEtablissements({ role, detailData, detailCharge, etabs, onOuvrirTiroir, onConfirmRetrait }) {
  const data   = detailData[role.uuid]
  const charge = detailCharge[role.uuid]
  const assignes = new Set((data ?? []).map((x) => x.etablissementUuid))

  return (
    <div style={{ padding: '12px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <strong style={{ fontSize:'0.88rem' }}>
          Établissements ayant accès à « {role.libelle} »
        </strong>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
          onClick={() => onOuvrirTiroir(role)}>
          <Plus size={13} /> Assigner à des établissements
        </button>
      </div>
      {charge ? (
        <Loader mode="inline" label="Chargement…" />
      ) : !data || data.length === 0 ? (
        <p style={{ color:'var(--ap-muted)', fontSize:'0.85rem', margin:0 }}>
          Aucun établissement assigné à ce rôle.
          {' '}<button type="button" style={{ background:'none', border:0, color:'var(--ap-green)', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600, padding:0 }}
            onClick={() => onOuvrirTiroir(role)}>Assigner maintenant</button>
        </p>
      ) : (
        <table className="ap-table" style={{ marginBottom:0 }}>
          <thead><tr><th>Établissement</th><th>Slug</th><th></th></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.uuid}>
                <td><strong>{a.etablissementNom}</strong></td>
                <td><span className="ap-code">{a.etablissementSlug}</span></td>
                <td>
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                    onClick={() => onConfirmRetrait({ assignationUuid: a.uuid, roleUuid: role.uuid, roleLibelle: role.libelle, etabNom: a.etablissementNom })}
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
  )
}

export default function RolesPage() {
  const notify = useNotify()

  const [roles,         setRoles]         = useState(null)
  const [etabs,         setEtabs]         = useState([])
  const [charge,        setCharge]        = useState(false)
  const [modale,        setModale]        = useState(null)     // null | 'creer' | { role }
  const [supprimer,     setSupprimer]     = useState(null)
  const [busy,          setBusy]          = useState(false)
  const [form,          setForm]          = useState({ code:'', libelle:'', familleAuth:'personnel_admin', etabsChoisis:[] })
  const [rechercheEtab, setRechercheEtab] = useState('')
  const [erreurs,       setErreurs]       = useState({})

  // Détail déplié - commun système + personnalisé
  const [detailRole,   setDetailRole]   = useState(null)   // uuid du rôle déplié
  const [detailData,   setDetailData]   = useState({})     // { [roleUuid]: EtabAssigne[] }
  const [detailCharge, setDetailCharge] = useState({})     // { [roleUuid]: bool }

  // Tiroir assignation
  const [tiroir,        setTiroir]        = useState(null) // { roleUuid, roleLibelle }
  const [confirmRetrait, setConfirmRetrait] = useState(null)

  /* Charger rôles + établissements */
  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const [rRoles, rEtabs] = await Promise.all([
        utilisateursService.listerRoles(),
        adminService.listerEtablissements(),
      ])
      setRoles(rRoles?.data?.roles ?? rRoles?.roles ?? [])
      const tousEtabs = Array.isArray(rEtabs) ? rEtabs : rEtabs?.etablissements ?? []
      setEtabs(tousEtabs.filter((e) => e.statut === 'actif'))
    } catch (err) {
      notify.fromError(err)
      setRoles([])
    } finally {
      setCharge(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  /* Charger les établissements d'un rôle */
  const chargerDetail = useCallback(async (roleUuid) => {
    setDetailCharge((d) => ({ ...d, [roleUuid]: true }))
    try {
      const r = await rolesEtablissementsService.etablissementsParRole(roleUuid)
      // L'intercepteur wrappe les tableaux : { success: true, data: [...] }
      const liste = Array.isArray(r?.data) ? r.data
        : Array.isArray(r) ? r
        : Array.isArray(r?.etablissements) ? r.etablissements
        : []
      setDetailData((d) => ({ ...d, [roleUuid]: liste }))
      return liste
    } catch (err) {
      notify.fromError(err)
      setDetailData((d) => ({ ...d, [roleUuid]: [] }))
      return []
    } finally {
      setDetailCharge((d) => ({ ...d, [roleUuid]: false }))
    }
  }, [notify])

  const toggleDetail = async (roleUuid) => {
    if (detailRole === roleUuid) { setDetailRole(null); return }
    setDetailRole(roleUuid)
    await chargerDetail(roleUuid)
  }

  /* Ouvrir le tiroir - charge les assignations existantes pour filtrer */
  const ouvrirTiroir = async (role) => {
    await chargerDetail(role.uuid)
    setTiroir({ roleUuid: role.uuid, roleLibelle: role.libelle })
  }

  /* Assigner */
  const assignerEtablissements = async (etabUuids) => {
    if (!tiroir) return
    const { roleUuid, roleLibelle } = tiroir
    setBusy(true)
    try {
      const r = await rolesEtablissementsService.assigner(roleUuid, etabUuids)
      const assignes = r?.assignes ?? r?.data?.assignes ?? 0
      setTiroir(null)
      await chargerDetail(roleUuid)
      setDetailRole(roleUuid)
      if (assignes > 0) {
        notify.success('Rôle assigné', `${roleLibelle} assigné à ${assignes} établissement(s).`)
      } else {
        notify.success('Déjà assigné', `Ces établissements ont déjà accès à ${roleLibelle}.`)
      }
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* Retirer */
  const retirerRole = async () => {
    if (!confirmRetrait) return
    const { roleUuid } = confirmRetrait
    setBusy(true)
    try {
      await rolesEtablissementsService.retirer(confirmRetrait.assignationUuid)
      notify.success('Rôle retiré', 'Les utilisateurs concernés ont été réattribués au rôle Personnel.')
      setConfirmRetrait(null)
      await chargerDetail(roleUuid)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* CRUD rôles personnalisés */
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
          code: form.code.trim(), libelle: form.libelle.trim(), familleAuth: form.familleAuth,
        })
        roleUuid = r?.data?.uuid ?? r?.uuid
        notify.success('Rôle créé', form.code)
        if (form.etabsChoisis.length > 0 && roleUuid) {
          await rolesEtablissementsService.assigner(roleUuid, form.etabsChoisis)
        }
      } else {
        await utilisateursService.modifierRole(modale.role.uuid, {
          libelle: form.libelle.trim(), familleAuth: form.familleAuth,
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

  /* Calculs */
  const systemes = roles?.filter((r) => !r.estPersonnalise) ?? []
  const perso    = roles?.filter((r) => r.estPersonnalise)  ?? []

  const etabsFiltres = etabs.filter((e) =>
    !rechercheEtab || e.nom?.toLowerCase().includes(rechercheEtab.toLowerCase()),
  )
  const dejaAssignesSet = new Set(
    tiroir ? (detailData[tiroir.roleUuid] ?? []).map((x) => x.etablissementUuid) : [],
  )
  const itemsTiroir = etabs
    .filter((e) => !dejaAssignesSet.has(e.uuid))
    .map((e) => ({ id: e.uuid, title: e.nom, subtitle: e.slug ?? e.code }))

  /* ── Rendu ── */
  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Rôles</h2>
          <p className="ap-page-sub">
            Gérez les rôles système et personnalisés et leur accès aux établissements.
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
          {/* ── Rôles système ── */}
          <h3 style={{ marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles système
          </h3>
          <div className="ap-card ap-card--flush" style={{ marginBottom:28 }}>
            <table className="ap-table">
              <thead>
                <tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Établissements</th><th></th></tr>
              </thead>
              <tbody>
                {systemes.map((r) => (
                  <React.Fragment key={r.uuid}>
                    <tr>
                      <td><span className="ap-code">{r.code}</span></td>
                      <td>{r.libelle}</td>
                      <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                      <td>
                        {r.code === 'super_admin' ? (
                          <span style={{ color:'var(--ap-muted)', fontSize:'0.85rem' }}>-</span>
                        ) : (
                          <button type="button"
                            style={{ background:'none', border:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--ap-green)', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600, padding:'2px 0' }}
                            onClick={() => toggleDetail(r.uuid)}>
                            <Building2 size={14} aria-hidden="true" />
                            {detailData[r.uuid] != null
                              ? `${detailData[r.uuid].length} établissement${detailData[r.uuid].length > 1 ? 's' : ''}`
                              : 'Voir les établissements'}
                            {detailRole === r.uuid ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          {r.code !== 'super_admin' && (
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                              onClick={() => ouvrirTiroir(r)}>
                              <Building2 size={13} /> Assigner
                            </button>
                          )}
                          <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--ap-muted)', fontSize:'0.82rem' }}>
                            <Lock size={12} /> Système
                          </span>
                        </div>
                      </td>
                    </tr>
                    {detailRole === r.uuid && r.code !== 'super_admin' && (
                      <tr key={`${r.uuid}-detail`}>
                        <td colSpan={5} style={{ padding:0, background:'rgba(0,107,60,0.03)' }}>
                          <DetailEtablissements
                            role={r}
                            detailData={detailData}
                            detailCharge={detailCharge}
                            etabs={etabs}
                            onOuvrirTiroir={ouvrirTiroir}
                            onConfirmRetrait={setConfirmRetrait}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Rôles personnalisés ── */}
          <h3 style={{ marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles personnalisés
          </h3>
          {perso.length === 0 ? (
            <div className="ap-card ap-empty">
              <p>Aucun rôle personnalisé.</p>
              <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}>
                <Plus size={14} /> Créer
              </button>
            </div>
          ) : (
            <div className="ap-card ap-card--flush">
              <table className="ap-table">
                <thead>
                  <tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Établissements</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {perso.map((r) => (
                    <React.Fragment key={r.uuid}>
                      <tr>
                        <td><span className="ap-code">{r.code}</span></td>
                        <td>{r.libelle}</td>
                        <td><span className="ap-badge ap-badge--neutral">{FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}</span></td>
                        <td>
                          <button type="button"
                            style={{ background:'none', border:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--ap-green)', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600, padding:'2px 0' }}
                            onClick={() => toggleDetail(r.uuid)}>
                            <Building2 size={14} aria-hidden="true" />
                            {detailData[r.uuid] != null
                              ? `${detailData[r.uuid].length} établissement${detailData[r.uuid].length > 1 ? 's' : ''}`
                              : 'Voir les établissements'}
                            {detailRole === r.uuid ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                              onClick={() => ouvrirTiroir(r)}>
                              <Building2 size={13} /> Assigner
                            </button>
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                              onClick={() => ouvrirModifier(r)}>
                              Modifier
                            </button>
                            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm"
                              onClick={() => setSupprimer(r)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {detailRole === r.uuid && (
                        <tr key={`${r.uuid}-detail`}>
                          <td colSpan={5} style={{ padding:0, background:'rgba(0,107,60,0.03)' }}>
                            <DetailEtablissements
                              role={r}
                              detailData={detailData}
                              detailCharge={detailCharge}
                              etabs={etabs}
                              onOuvrirTiroir={ouvrirTiroir}
                              onConfirmRetrait={setConfirmRetrait}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          <div className="cfg-modale" style={{ maxWidth:580 }}>
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
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'') }))}
                      placeholder="ex. comptable" />
                    <p className="ap-hint">Minuscules, chiffres, tirets. Immuable après création.</p>
                    {erreurs.code && <p className="ap-error">{erreurs.code}</p>}
                  </div>
                )}
                <div className={`ap-field${erreurs.libelle ? ' has-error':''}`}>
                  <label className="ap-label" htmlFor="r-libelle">Libellé <em>*</em></label>
                  <input id="r-libelle" className="ap-input" value={form.libelle}
                    onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                    placeholder="Ex. Comptable" />
                  {erreurs.libelle && <p className="ap-error">{erreurs.libelle}</p>}
                </div>
                <div className="ap-field">
                  <label className="ap-label">Famille d'authentification</label>
                  <div style={{ display:'flex', gap:12 }}>
                    {FAMILLE_OPTIONS.map((o) => (
                      <label key={o.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.88rem', fontWeight: form.familleAuth === o.id ? 700 : 400 }}>
                        <input type="radio" name="fa" value={o.id} checked={form.familleAuth === o.id}
                          onChange={() => setForm((f) => ({ ...f, familleAuth: o.id }))} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                {modale === 'creer' && (
                  <div className="ap-field">
                    <label className="ap-label">Établissements (optionnel)</label>
                    <p className="ap-hint" style={{ marginBottom:8 }}>Sélectionnez les établissements qui auront accès à ce rôle dès la création.</p>
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

      {/* Confirmation suppression rôle personnalisé */}
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
