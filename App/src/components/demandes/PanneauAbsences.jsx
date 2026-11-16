import { useState } from 'react'
import { CalendarX2, Check, Plus, RefreshCw, X } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { demandesService } from '../../services/demandes/demandes.service'
import { STATUTS_PERMISSION, libelleStatut, nomBeneficiaire } from '../../config/demandes/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import ConfirmDialog from '../commun/ConfirmDialog'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, formatDate, useDonnees } from '../modules/outils'

const aujourdhui = () => new Date().toISOString().slice(0, 10)

/**
 * Permissions d'absence.
 *  - mode « miennes » (apprenant, parent) : déclarer une absence, suivre, annuler avant son début ;
 *  - mode « validation » (valider_permission_absence) : décider, en attente d'abord. Vie scolaire en tient compte.
 */
export default function PanneauAbsences({ mode }) {
  const notify = useNotify()
  const validation = mode === 'validation'
  const [f, setF] = useState({ statut: validation ? 'en_attente' : '', page: 1 })
  const liste = useDonnees(() => (validation ? demandesService.permissions(f) : demandesService.mesPermissions(f)), [mode, f.statut, f.page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const [nouvelle, setNouvelle] = useState(false)
  const [decision, setDecision] = useState(null) // { p, decision }
  const [aAnnuler, setAAnnuler] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const elements = liste.donnees?.elements ?? []

  const annuler = async () => {
    setEnvoi(true)
    try {
      await demandesService.annulerPermission(aAnnuler.uuid)
      notify.success('Permission annulée')
      setAAnnuler(null)
      liste.recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-abs">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-abs">{validation ? 'Permissions d\'absence à valider' : 'Permissions d\'absence'}</h2>
          <p className="ap-page-sub">{validation ? 'Une permission validée justifie les absences de la période auprès de la vie scolaire.' : 'Prévenez l\'établissement d\'une absence et suivez la réponse.'}</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          {!validation && <button type="button" className="ap-btn ap-btn--sm" onClick={() => setNouvelle(true)}><Plus size={15} aria-hidden="true" /> Déclarer une absence</button>}
        </div>
      </div>

      <div className="ap-filters" role="tablist" aria-label="Statut">
        {[['', 'Toutes'], ...Object.entries(STATUTS_PERMISSION).map(([k, v]) => [k, v.libelle])].map(([k, l]) => (
          <button key={k || 'toutes'} type="button" role="tab" aria-selected={f.statut === k} className={`ap-tab${f.statut === k ? ' is-active' : ''}`}
            onClick={() => setF({ statut: k, page: 1 })}>{l}</button>
        ))}
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement…" /> : elements.length === 0 ? (
        <EtatVide icone={CalendarX2} titre="Aucune permission" texte={validation ? 'Rien à traiter dans cette sélection.' : 'Aucune absence déclarée.'} />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Permissions d'absence</caption>
              <thead><tr><th scope="col">Apprenant</th><th scope="col">Du</th><th scope="col">Au</th><th scope="col">Motif</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Actions</span></th></tr></thead>
              <tbody>
                {elements.map((p) => {
                  const s = libelleStatut(STATUTS_PERMISSION, p.statut)
                  return (
                    <tr key={p.uuid}>
                      <td>{nomBeneficiaire(p.apprenant) ?? <span className="ev-muet">Nom indisponible</span>}</td>
                      <td>{formatDate(p.date_debut)}</td>
                      <td>{formatDate(p.date_fin)}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 200, maxWidth: 360 }}>{p.motif}{p.motif_decision && <small>Réponse : {p.motif_decision}</small>}</td>
                      <td><Badge ton={s.badge}>{s.libelle}</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
                          {validation && p.statut === 'en_attente' && (
                            <>
                              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setDecision({ p, decision: 'rejetee' })}><X size={14} aria-hidden="true" /> Rejeter</button>
                              <button type="button" className="ap-btn ap-btn--sm" onClick={() => setDecision({ p, decision: 'validee' })}><Check size={14} aria-hidden="true" /> Valider</button>
                            </>
                          )}
                          {!validation && (p.statut === 'en_attente' || (p.statut === 'validee' && p.date_debut > aujourdhui())) && (
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setAAnnuler(p)}>Annuler</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={(n) => setF((x) => ({ ...x, page: n }))} unite="permission" />
        </div>
      )}

      {!validation && <NouvellePermission open={nouvelle} onClose={() => setNouvelle(false)} onCree={liste.recharger} />}
      {validation && <Decision cible={decision} onClose={() => setDecision(null)} onDecidee={liste.recharger} />}
      <ConfirmDialog open={!!aAnnuler} tone="warning" title="Annuler la permission ?" message="L'établissement en sera informé." confirmLabel="Annuler la permission"
        cancelLabel="Retour" loading={envoi} onConfirm={annuler} onCancel={() => !envoi && setAAnnuler(null)} />
    </section>
  )
}

function NouvellePermission({ open, onClose, onCree }) {
  const notify = useNotify()
  const apprenants = useDonnees(() => demandesService.mesApprenants(), [], { actif: open, initial: [] })
  const vide = { apprenant: '', date_debut: aujourdhui(), date_fin: aujourdhui(), motif: '' }
  const [f, setF] = useState(vide)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const liste = apprenants.donnees ?? []
  const apprenant = f.apprenant || (liste.length === 1 ? liste[0].uuid : '')
  const fermer = () => { if (!envoi) { setF(vide); setErreurs({}); onClose() } }
  const maj = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const envoyer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!apprenant) e.apprenant_uuid = 'Choisissez l\'apprenant.'
    if (!f.date_debut) e.date_debut = 'Date de début obligatoire.'
    if (!f.date_fin || f.date_fin < f.date_debut) e.date_fin = 'La fin ne peut pas précéder le début.'
    if (f.motif.trim().length < 5) e.motif = 'Motif de 5 caractères au moins.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await demandesService.soumettrePermission({ apprenant_uuid: apprenant, date_debut: f.date_debut, date_fin: f.date_fin, motif: f.motif.trim() })
      notify.success('Absence déclarée', 'L\'établissement va examiner votre demande.')
      setF(vide)
      onClose()
      onCree()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Déclarer une absence" subtitle="Jusqu'à 90 jours ; une absence passée se déclare dans les jours qui suivent." onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-perm" className="ap-btn" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer'}</button>
        </>
      )}>
      <form id="ev-form-perm" className="ev ev-form" onSubmit={envoyer} noValidate>
        <Champ id="ev-np-app" label="Apprenant" requis erreur={erreurs.apprenant_uuid}>
          <select {...aria('ev-np-app', erreurs.apprenant_uuid)} className="ap-input" value={apprenant} disabled={apprenants.chargement} onChange={maj('apprenant')}>
            <option value="">{apprenants.chargement ? 'Chargement…' : liste.length ? 'Choisir' : 'Aucun dossier rattaché à votre compte'}</option>
            {liste.map((a) => <option key={a.uuid} value={a.uuid}>{nomBeneficiaire(a)}</option>)}
          </select>
        </Champ>
        <div className="ev-deux">
          <Champ id="ev-np-deb" label="Du" requis erreur={erreurs.date_debut}>
            <input {...aria('ev-np-deb', erreurs.date_debut)} type="date" className="ap-input" value={f.date_debut} onChange={maj('date_debut')} />
          </Champ>
          <Champ id="ev-np-fin" label="Au" requis erreur={erreurs.date_fin}>
            <input {...aria('ev-np-fin', erreurs.date_fin)} type="date" className="ap-input" value={f.date_fin} min={f.date_debut} onChange={maj('date_fin')} />
          </Champ>
        </div>
        <Champ id="ev-np-motif" label="Motif" requis erreur={erreurs.motif}>
          <textarea {...aria('ev-np-motif', erreurs.motif)} className="ap-textarea" rows={4} maxLength={1000} value={f.motif}
            placeholder="Exemple : rendez-vous médical à Cotonou." onChange={maj('motif')} />
        </Champ>
      </form>
    </Drawer>
  )
}

function Decision({ cible, onClose, onDecidee }) {
  const notify = useNotify()
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const rejet = cible?.decision === 'rejetee'
  const fermer = () => { if (!envoi) { setMotif(''); setErreur(null); onClose() } }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (rejet && motif.trim().length < 10) { setErreur('Motif de 10 caractères au moins pour un rejet.'); return }
    if (!rejet && motif.trim() && motif.trim().length < 10) { setErreur('Commentaire de 10 caractères au moins, ou laissez vide.'); return }
    setEnvoi(true)
    try {
      await demandesService.deciderPermission(cible.p.uuid, { decision: cible.decision, ...(motif.trim() ? { motif: motif.trim() } : {}) })
      notify.success(rejet ? 'Permission rejetée' : 'Permission validée')
      setMotif('')
      setErreur(null)
      onClose()
      onDecidee()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={!!cible} title={rejet ? 'Rejeter la permission' : 'Valider la permission'}
      subtitle={cible ? `${nomBeneficiaire(cible.p.apprenant) ?? 'Apprenant'} - du ${formatDate(cible.p.date_debut)} au ${formatDate(cible.p.date_fin)}` : undefined}
      onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-decision" className={`ap-btn${rejet ? ' ap-btn--danger' : ''}`} disabled={envoi}>{rejet ? 'Rejeter' : 'Valider'}</button>
        </>
      )}>
      {cible && (
        <form id="ev-form-decision" className="ev ev-form" onSubmit={envoyer} noValidate>
          <dl className="ev-fiche"><dt>Motif de la famille</dt><dd>{cible.p.motif}</dd></dl>
          <Champ id="ev-dc-motif" label={rejet ? 'Motif du rejet' : 'Commentaire'} requis={rejet} erreur={erreur}>
            <textarea {...aria('ev-dc-motif', erreur)} className="ap-textarea" rows={4} maxLength={1000} value={motif}
              placeholder={rejet ? 'Exemple : période d\'examens, présence obligatoire.' : 'Exemple : bon rétablissement.'} onChange={(e) => setMotif(e.target.value)} />
          </Champ>
        </form>
      )}
    </Drawer>
  )
}
