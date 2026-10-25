/**
 * DemandesRolePage — Super Admin instruite les demandes de rôle personnalisé.
 *
 * Accepter = créer le rôle avec :
 *   - Libellé (pré-rempli avec nomSouhaite, modifiable)
 *   - Famille d'auth
 *   - Multi-sélection des établissements actifs (l'établissement demandeur est pré-coché)
 * Refuser = note obligatoire
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, Inbox, XCircle, X } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import Loader from '../../components/commun/Loader'
import { demandesRoleAdminService } from '../../services/identite/rolesEtablissements.service'
import { adminService } from '../../services/etablissements/etablissement.service'
import './admin.css'

const TABS = [
  { id: 'en_attente', label: 'À instruire' },
  { id: 'acceptee',   label: 'Acceptées' },
  { id: 'refusee',    label: 'Refusées' },
  { id: 'tous',       label: 'Toutes' },
]

const FAMILLE_OPTIONS = [
  { id: 'personnel_admin',  label: 'Personnel / Admin' },
  { id: 'parent_apprenant', label: 'Parent / Apprenant' },
]

const STATUT_BADGE = { en_attente:'ap-badge--warning', acceptee:'ap-badge--success', refusee:'ap-badge--danger' }
const STATUT_LABEL = { en_attente:'En attente', acceptee:'Acceptée', refusee:'Refusée' }

export default function DemandesRolePage() {
  const notify = useNotify()
  const [onglet,     setOnglet]     = useState('en_attente')
  const [demandes,   setDemandes]   = useState(null)
  const [etabs,      setEtabs]      = useState([])
  const [charge,     setCharge]     = useState(false)
  const [cible,      setCible]      = useState(null)  // { demande, action: 'accepter'|'refuser' }
  const [busy,       setBusy]       = useState(false)

  // Formulaire acceptation
  const [libelle,    setLibelle]    = useState('')
  const [familleAuth,setFamilleAuth]= useState('personnel_admin')
  const [etabsChoisis,setEtabsChoisis]= useState([]) // UUIDs
  const [note,       setNote]       = useState('')
  const [rechercheEtab, setRechercheEtab] = useState('')

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const [rD, rE] = await Promise.all([
        demandesRoleAdminService.listerToutesDemandes(onglet),
        adminService.listerEtablissements(),
      ])
      setDemandes(rD?.data ?? rD ?? [])
      setEtabs((Array.isArray(rE) ? rE : []).filter((e) => e.statut === 'actif'))
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
    if (action === 'accepter') {
      setLibelle(demande.nomSouhaite)
      setFamilleAuth('personnel_admin')
      setEtabsChoisis([demande.etablissementUuid])
      setRechercheEtab('')
    }
  }

  const confirmer = async () => {
    if (!cible) return
    if (cible.action === 'refuser' && note.trim().length < 10) {
      notify.warning('Note requise', 'Saisissez une note d\'au moins 10 caractères.')
      return
    }
    if (cible.action === 'accepter' && !libelle.trim()) {
      notify.warning('Libellé requis', 'Saisissez le libellé du rôle.')
      return
    }
    setBusy(true)
    try {
      if (cible.action === 'accepter') {
        await demandesRoleAdminService.accepter(cible.demande.uuid, {
          libelle:           libelle.trim(),
          familleAuth,
          etablissementUuids: etabsChoisis,
          note,
        })
        notify.success('Rôle créé et assigné', `Le rôle « ${libelle} » a été créé.`)
      } else {
        await demandesRoleAdminService.refuser(cible.demande.uuid, note)
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

  const toggleEtab = (uuid) => {
    setEtabsChoisis((prev) =>
      prev.includes(uuid) ? prev.filter((u) => u !== uuid) : [...prev, uuid],
    )
  }

  const etabsFiltres = etabs.filter((e) =>
    !rechercheEtab || e.nom?.toLowerCase().includes(rechercheEtab.toLowerCase()),
  )

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Demandes de rôle</h2>
          <p className="ap-page-sub">
            Les administrateurs d'établissement peuvent demander la création d'un rôle personnalisé.
            Vous pouvez l'accepter (crée le rôle et l'assigne) ou le refuser.
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
          <RefreshCw size={14} className={charge ? 'ap-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="ap-filters">
        {TABS.map((t) => (
          <button key={t.id} type="button"
            className={`ap-tab${onglet === t.id ? ' is-active' : ''}`}
            onClick={() => setOnglet(t.id)}>
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
                  <th>Nom souhaité</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((d) => (
                  <tr key={d.uuid}>
                    <td><strong>{d.etablissementNom ?? '—'}</strong><small>{d.etablissementSlug ?? ''}</small></td>
                    <td><strong>{d.nomSouhaite}</strong></td>
                    <td style={{ maxWidth:260 }}>
                      <small style={{ color:'var(--ap-muted)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.description}
                      </small>
                    </td>
                    <td>{fmt(d.createdAt)}</td>
                    <td><span className={`ap-badge ${STATUT_BADGE[d.statut] ?? 'ap-badge--neutral'}`}>{STATUT_LABEL[d.statut] ?? d.statut}</span></td>
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
                      {d.noteInstruction && d.statut !== 'en_attente' && (
                        <small style={{ color:'var(--ap-muted)', fontSize:'0.78rem' }}>{d.noteInstruction}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale instruction */}
      {cible && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true">
          <div className="cfg-modale" style={{ maxWidth: cible.action === 'accepter' ? 600 : 480 }}>
            <div className="cfg-modale-tete">
              <h3 style={{ margin:0, fontWeight:700, fontSize:'1rem', color: cible.action === 'accepter' ? '#006B3C' : '#c0392b' }}>
                {cible.action === 'accepter' ? 'Accepter et créer le rôle' : 'Refuser la demande'}
              </h3>
              <button type="button" className="ap-drawer-close" onClick={() => setCible(null)} aria-label="Fermer"><X size={16}/></button>
            </div>
            <div className="cfg-modale-corps">
              <p style={{ fontSize:'0.88rem', color:'var(--sg-text-secondary)', marginBottom:14 }}>
                Établissement : <strong>{cible.demande.etablissementNom}</strong><br />
                Nom demandé : <strong>{cible.demande.nomSouhaite}</strong>
              </p>

              {cible.action === 'accepter' && (
                <>
                  {/* Justification de l'établissement */}
                  <div className="ap-alert ap-alert--warning" style={{ marginBottom:14 }}>
                    <div><strong>Justification</strong>{cible.demande.description}</div>
                  </div>

                  <div className="ap-field">
                    <label className="ap-label" htmlFor="ar-libelle">Libellé du rôle <em>*</em></label>
                    <input id="ar-libelle" className="ap-input" value={libelle}
                      onChange={(e) => setLibelle(e.target.value)} />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label">Famille d'authentification</label>
                    <div style={{ display:'flex', gap:12 }}>
                      {FAMILLE_OPTIONS.map((o) => (
                        <label key={o.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.88rem', fontWeight: familleAuth === o.id ? 700 : 400 }}>
                          <input type="radio" name="fa" value={o.id} checked={familleAuth === o.id}
                            onChange={() => setFamilleAuth(o.id)} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sélection des établissements */}
                  <div className="ap-field">
                    <label className="ap-label">Établissements ayant accès à ce rôle</label>
                    <p className="ap-hint" style={{ marginBottom:8 }}>
                      L'établissement demandeur est sélectionné par défaut. Vous pouvez en ajouter d'autres.
                    </p>
                    <div className="ap-search" style={{ marginBottom:8 }}>
                      <input className="ap-input" placeholder="Rechercher un établissement…"
                        value={rechercheEtab} onChange={(e) => setRechercheEtab(e.target.value)} />
                    </div>
                    <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid var(--sg-border)', borderRadius:8 }}>
                      {etabsFiltres.length === 0 ? (
                        <p style={{ padding:'12px 14px', color:'var(--sg-text-muted)', fontSize:'0.85rem', margin:0 }}>
                          Aucun établissement actif trouvé.
                        </p>
                      ) : etabsFiltres.map((e, i) => {
                        const checked = etabsChoisis.includes(e.uuid)
                        const estDemandeur = e.uuid === cible.demande.etablissementUuid
                        return (
                          <label key={e.uuid}
                            className={`ap-check-row${checked ? ' is-on' : ''}`}
                            style={{ '--i': i, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: i === 0 ? 0 : undefined }}>
                            <input type="checkbox" className="ap-check" checked={checked}
                              onChange={() => toggleEtab(e.uuid)} />
                            <div className="ap-check-info">
                              <strong>{e.nom}</strong>
                              <small>{e.slug ?? ''}{estDemandeur ? ' · Demandeur' : ''}</small>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <p className="ap-hint">{etabsChoisis.length} établissement(s) sélectionné(s)</p>
                  </div>
                </>
              )}

              <div className="ap-field">
                <label className="ap-label" htmlFor="ar-note">
                  Note {cible.action === 'refuser' ? <em>*</em> : '(optionnel)'}
                </label>
                <textarea id="ar-note" className="ap-textarea" rows={3}
                  placeholder={cible.action === 'refuser' ? 'Expliquez le motif du refus (obligatoire).' : 'Commentaire optionnel.'}
                  value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setCible(null)} disabled={busy}>Annuler</button>
              <button type="button"
                className={`ap-btn${cible.action === 'refuser' ? ' ap-btn--danger' : ''}`}
                onClick={confirmer} disabled={busy}>
                {busy ? 'Traitement…' : cible.action === 'accepter' ? 'Créer et assigner le rôle' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
