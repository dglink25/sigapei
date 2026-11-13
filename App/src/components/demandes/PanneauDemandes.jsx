import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, Download, FilePlus2, FileText, RefreshCw, RotateCcw, Search, ShieldAlert, Star, XCircle } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { demandesService } from '../../services/demandes/demandes.service'
import { FAMILLE, STATUTS_DEMANDE, libelleRole, libelleStatut, nomBeneficiaire } from '../../config/demandes/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import ConfirmDialog from '../commun/ConfirmDialog'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, formatDate, formatDateHeure, useDonnees } from '../modules/outils'

/**
 * Demandes de documents.
 *  - mode « mes » : demandes de l'utilisateur (suivi, téléchargement, annulation, relance) et nouvelle demande ;
 *  - mode « file » : file de l'établissement (consulter_demandes) ; actions selon les droits du profil.
 */
export default function PanneauDemandes({ mode, role, actions = [] }) {
  const notify = useNotify()
  const gestion = mode === 'file'
  const [f, setF] = useState({ statut: gestion ? '' : '', type_document_uuid: '', recherche: '', tri: gestion ? 'priorite' : 'recentes', page: 1 })
  const [saisieRecherche, setSaisieRecherche] = useState('')
  const liste = useDonnees(() => (gestion ? demandesService.file(f) : demandesService.mesDemandes(f)), [mode, f.statut, f.type_document_uuid, f.recherche, f.tri, f.page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const types = useDonnees(() => demandesService.types(false), [], { initial: [] })
  const [ouverte, setOuverte] = useState(null)
  const [nouvelle, setNouvelle] = useState(false)

  const maj = (k, v) => setF((x) => ({ ...x, [k]: v, page: k === 'page' ? v : 1 }))
  const elements = liste.donnees?.elements ?? []

  return (
    <section className="ev" aria-labelledby="ev-titre-demandes">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-demandes">{gestion ? 'Demandes à traiter' : 'Mes demandes de documents'}</h2>
          <p className="ap-page-sub">
            {gestion
              ? 'Les demandes prioritaires puis les plus anciennes. L\'éligibilité est revérifiée avant chaque document.'
              : 'Certificats, attestations, relevés : suivez chaque étape et téléchargez le document dès qu\'il est prêt.'}
          </p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          {!gestion && (
            <button type="button" className="ap-btn ap-btn--sm" onClick={() => setNouvelle(true)}>
              <FilePlus2 size={15} aria-hidden="true" /> Nouvelle demande
            </button>
          )}
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-dm-statut" label="Statut">
          <select {...aria('ev-dm-statut')} className="ap-input" value={f.statut} onChange={(e) => maj('statut', e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUTS_DEMANDE).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
          </select>
        </Champ>
        {gestion && (
          <Champ id="ev-dm-type" label="Document">
            <select {...aria('ev-dm-type')} className="ap-input" value={f.type_document_uuid} onChange={(e) => maj('type_document_uuid', e.target.value)}>
              <option value="">Tous les documents</option>
              {(types.donnees ?? []).map((t) => <option key={t.uuid} value={t.uuid}>{t.nom}</option>)}
            </select>
          </Champ>
        )}
        <form className="ap-field" onSubmit={(e) => { e.preventDefault(); maj('recherche', saisieRecherche.trim()) }}>
          <label className="ap-label" htmlFor="ev-dm-recherche">Référence</label>
          <div className="ap-search" style={{ margin: 0 }}>
            <Search size={16} aria-hidden="true" />
            <input id="ev-dm-recherche" type="search" className="ap-input" value={saisieRecherche} maxLength={30} placeholder="Exemple : DA-2026-000012"
              onChange={(e) => { setSaisieRecherche(e.target.value); if (!e.target.value) maj('recherche', '') }} />
          </div>
        </form>
        <Champ id="ev-dm-tri" label="Trier par">
          <select {...aria('ev-dm-tri')} className="ap-input" value={f.tri} onChange={(e) => maj('tri', e.target.value)}>
            {gestion && <option value="priorite">Prioritaires d'abord</option>}
            <option value="recentes">Plus récentes</option>
            <option value="anciennes">Plus anciennes</option>
          </select>
        </Champ>
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement des demandes…" /> : elements.length === 0 ? (
        <EtatVide icone={FileText} titre="Aucune demande" texte={gestion ? 'Aucune demande ne correspond à ces critères.' : 'Vous n\'avez pas encore fait de demande de document.'}>
          {!gestion && <button type="button" className="ap-btn ap-btn--sm" onClick={() => setNouvelle(true)}><FilePlus2 size={15} aria-hidden="true" /> Faire une demande</button>}
        </EtatVide>
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Demandes de documents</caption>
              <thead>
                <tr>
                  <th scope="col">Référence</th><th scope="col">Document</th><th scope="col">Pour</th>
                  <th scope="col">Déposée le</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Ouvrir</span></th>
                </tr>
              </thead>
              <tbody>
                {elements.map((d) => {
                  const s = libelleStatut(STATUTS_DEMANDE, d.statut)
                  return (
                    <tr key={d.uuid}>
                      <td><span className="ap-code">{d.reference}</span> {d.priorite && <Star size={14} aria-label="Prioritaire" style={{ color: 'var(--sg-gold, #E9AA20)', verticalAlign: '-2px' }} />}</td>
                      <td>{d.type_document?.nom}</td>
                      <td>{nomBeneficiaire(d.beneficiaire) ?? (gestion ? <span className="ev-muet">{libelleRole(d.demandeur_role)}</span> : <span className="ev-muet">Moi</span>)}</td>
                      <td>{formatDate(d.cree_le)}</td>
                      <td><Badge ton={s.badge}>{s.libelle}</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setOuverte(d.uuid)}>Ouvrir</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={(p) => maj('page', p)} unite="demande" />
        </div>
      )}

      <DetailDemande uuid={ouverte} gestion={gestion} actions={actions} onClose={() => setOuverte(null)} onChange={liste.recharger} />
      {!gestion && <NouvelleDemande open={nouvelle} role={role} types={types.donnees ?? []} onClose={() => setNouvelle(false)} onCree={(d) => { liste.recharger(); setOuverte(d.uuid) }} />}
    </section>
  )
}

function DetailDemande({ uuid, gestion, actions, onClose, onChange }) {
  const notify = useNotify()
  const d = useDonnees(() => demandesService.demande(uuid), [uuid], { actif: !!uuid, onErreur: notify.fromError })
  const [envoi, setEnvoi] = useState(false)
  const [motifAction, setMotifAction] = useState(null) // 'rejeter' | 'deroger'
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)
  const [traitement, setTraitement] = useState(null) // { corps, nom_complet }
  const [annulation, setAnnulation] = useState(false)
  const x = d.donnees
  const peut = (a) => actions.includes(a)

  const agir = async (fn, message) => {
    setEnvoi(true)
    try {
      await fn()
      notify.success(message)
      d.recharger()
      onChange()
      return true
    } catch (err) {
      notify.fromError(err)
      return false
    } finally {
      setEnvoi(false)
    }
  }

  const envoyerMotif = async (ev) => {
    ev.preventDefault()
    if (motif.trim().length < 10) { setErreur('Motif de 10 caractères au moins (il est communiqué et conservé).'); return }
    const ok = await agir(
      () => (motifAction === 'rejeter' ? demandesService.rejeter(x.uuid, motif.trim()) : demandesService.deroger(x.uuid, motif.trim())),
      motifAction === 'rejeter' ? 'Demande rejetée.' : 'Dérogation accordée.',
    )
    if (ok) { setMotifAction(null); setMotif(''); setErreur(null) }
  }

  const traiter = async (ev) => {
    ev.preventDefault()
    const corps = {}
    if (traitement.corps.trim()) corps.corps = traitement.corps.trim()
    if (traitement.nom_complet.trim()) corps.nom_complet = traitement.nom_complet.trim()
    if (corps.corps && corps.corps.length < 10) { setErreur('Texte du document : 10 caractères au moins.'); return }
    if (await agir(() => demandesService.traiter(x.uuid, corps), 'Document généré : le demandeur est notifié.')) { setTraitement(null); setErreur(null) }
  }

  const s = x ? libelleStatut(STATUTS_DEMANDE, x.statut) : null
  const enCours = x && ['recue', 'bloquee', 'en_traitement'].includes(x.statut)

  return (
    <>
      <Drawer open={!!uuid} title={x ? x.type_document?.nom : 'Demande'} subtitle={x?.reference} onClose={() => !envoi && onClose()} busy={envoi}
        footer={x && (
          <div className="ev-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
            {x.document_disponible && (
              <button type="button" className="ap-btn" disabled={envoi} onClick={() => agir(() => demandesService.telecharger(x.uuid), 'Téléchargement lancé.')}>
                <Download size={15} aria-hidden="true" /> Télécharger
              </button>
            )}
            {!gestion && x.statut === 'bloquee' && (
              <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => agir(() => demandesService.resoumettre(x.uuid), 'Vérification relancée.')}>
                <RotateCcw size={15} aria-hidden="true" /> Relancer la vérification
              </button>
            )}
            {!gestion && enCours && (
              <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => setAnnulation(true)}>
                <Ban size={15} aria-hidden="true" /> Annuler la demande
              </button>
            )}
            {gestion && peut('traiter_demande') && enCours && x.statut !== 'bloquee' && (
              <>
                <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => agir(() => demandesService.prioriser(x.uuid, !x.priorite), x.priorite ? 'Priorité retirée.' : 'Demande marquée prioritaire.')}>
                  <Star size={15} aria-hidden="true" /> {x.priorite ? 'Retirer la priorité' : 'Prioritaire'}
                </button>
                <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => { setMotifAction('rejeter'); setErreur(null) }}>
                  <XCircle size={15} aria-hidden="true" /> Rejeter
                </button>
                <button type="button" className="ap-btn" disabled={envoi} onClick={() => { setTraitement({ corps: '', nom_complet: '' }); setErreur(null) }}>
                  <CheckCircle2 size={15} aria-hidden="true" /> Générer le document
                </button>
              </>
            )}
            {gestion && x.statut === 'bloquee' && peut('accorder_derogation') && (
              <button type="button" className="ap-btn ap-btn--warn" disabled={envoi} onClick={() => { setMotifAction('deroger'); setErreur(null) }}>
                <ShieldAlert size={15} aria-hidden="true" /> Accorder une dérogation
              </button>
            )}
          </div>
        )}>
        {d.chargement ? <Chargement label="Chargement…" /> : x && (
          <div className="ev" style={{ gap: 14 }}>
            <p style={{ margin: 0 }}><Badge ton={s.badge}>{s.libelle}</Badge> {x.priorite && <Badge ton="warning">Prioritaire</Badge>}</p>
            {x.statut === 'bloquee' && x.motif_blocage && <div className="ap-alert ap-alert--warning"><ShieldAlert size={18} aria-hidden="true" /><div><strong>Demande bloquée</strong>{x.motif_blocage}</div></div>}
            {x.statut === 'rejetee' && x.motif_rejet && <div className="ap-alert ap-alert--danger"><XCircle size={18} aria-hidden="true" /><div><strong>Motif du rejet</strong>{x.motif_rejet}</div></div>}
            <dl className="ev-fiche">
              <dt>Pour</dt><dd>{nomBeneficiaire(x.beneficiaire) ?? (x.beneficiaire_apprenant_uuid ? 'Apprenant (nom indisponible)' : 'Le demandeur')}</dd>
              {gestion && <><dt>Demandeur</dt><dd>{libelleRole(x.demandeur_role)}</dd></>}
              <dt>Déposée le</dt><dd>{formatDateHeure(x.cree_le)}</dd>
              {x.delai_indicatif_jours != null && <><dt>Délai indicatif</dt><dd>{x.delai_indicatif_jours} jour{x.delai_indicatif_jours > 1 ? 's' : ''}</dd></>}
              {x.commentaire && <><dt>Précisions</dt><dd>{x.commentaire}</dd></>}
              {x.derogation && <><dt>Dérogation</dt><dd>{x.derogation.motif}</dd></>}
            </dl>
            {(x.etapes ?? []).length > 0 && (
              <div>
                <h3 className="ap-label" style={{ margin: '0 0 8px' }}>Suivi</h3>
                <ol className="ev-chrono">
                  {x.etapes.map((e, i) => (
                    <li key={i}><strong>{libelleStatut(STATUTS_DEMANDE, e.statut).libelle}</strong><span>{e.libelle}</span><time>{formatDateHeure(e.cree_le)}</time></li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!motifAction} title={motifAction === 'rejeter' ? 'Rejeter la demande' : 'Accorder une dérogation'}
        subtitle={motifAction === 'deroger' ? 'Le blocage est levé malgré la règle non remplie. La décision est journalisée.' : 'Le demandeur verra ce motif.'}
        onClose={() => !envoi && setMotifAction(null)} busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setMotifAction(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-motif-demande" className={`ap-btn${motifAction === 'rejeter' ? ' ap-btn--danger' : ''}`} disabled={envoi}>Confirmer</button>
          </>
        )}>
        <form id="ev-form-motif-demande" className="ev ev-form" onSubmit={envoyerMotif} noValidate>
          <Champ id="ev-dm-motif" label="Motif" requis erreur={erreur}>
            <textarea {...aria('ev-dm-motif', erreur)} className="ap-textarea" rows={5} maxLength={1000} value={motif}
              placeholder={motifAction === 'rejeter' ? 'Exemple : le dossier de l\'apprenant n\'est pas complet, merci de passer au secrétariat.' : 'Exemple : réinscription validée en conseil, dossier en cours de mise à jour.'}
              onChange={(e) => setMotif(e.target.value)} />
          </Champ>
        </form>
      </Drawer>

      <Drawer open={!!traitement} title="Générer le document" subtitle="Le modèle du type de document est utilisé. Pour un cas particulier, saisissez le texte."
        onClose={() => !envoi && setTraitement(null)} busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setTraitement(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-traiter" className="ap-btn" disabled={envoi}>{envoi ? 'Génération…' : 'Générer'}</button>
          </>
        )}>
        {traitement && (
          <form id="ev-form-traiter" className="ev ev-form" onSubmit={traiter} noValidate>
            <Champ id="ev-dm-corps" label="Texte du document" erreur={erreur} aide="Facultatif : laissé vide, le modèle configuré est utilisé.">
              <textarea {...aria('ev-dm-corps', erreur, true)} className="ap-textarea" rows={7} maxLength={4000} value={traitement.corps}
                placeholder="Exemple : Je soussigné, Directeur du collège, certifie que…" onChange={(e) => setTraitement((t) => ({ ...t, corps: e.target.value }))} />
            </Champ>
            <Champ id="ev-dm-nom" label="Nom imprimé" aide="Facultatif : à renseigner si le dossier ne fournit pas le nom.">
              <input {...aria('ev-dm-nom', null, true)} className="ap-input" maxLength={150} value={traitement.nom_complet}
                placeholder="Exemple : ADJO Alice" onChange={(e) => setTraitement((t) => ({ ...t, nom_complet: e.target.value }))} />
            </Champ>
          </form>
        )}
      </Drawer>

      <ConfirmDialog open={annulation} tone="warning" title="Annuler la demande ?" message="La demande sera close. Vous pourrez en faire une nouvelle."
        confirmLabel="Annuler la demande" cancelLabel="Retour" loading={envoi}
        onConfirm={async () => { if (await agir(() => demandesService.annuler(x.uuid), 'Demande annulée.')) setAnnulation(false) }}
        onCancel={() => !envoi && setAnnulation(false)} />
    </>
  )
}

function NouvelleDemande({ open, role, types, onClose, onCree }) {
  const notify = useNotify()
  const famille = FAMILLE.includes(role)
  const apprenants = useDonnees(() => demandesService.mesApprenants(), [], { actif: open && famille, initial: [] })
  const [f, setF] = useState({ type: '', beneficiaire: '', commentaire: '' })
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)

  const disponibles = useMemo(() => types.filter((t) => t.categorie_demandeur === 'tout_profil' || t.categorie_demandeur === (famille ? 'apprenant' : 'personnel')), [types, famille])
  const type = disponibles.find((t) => t.uuid === f.type)
  const pourApprenant = type?.categorie_demandeur === 'apprenant'
  const liste = apprenants.donnees ?? []
  const beneficiaire = f.beneficiaire || (liste.length === 1 ? liste[0].uuid : '')

  const fermer = () => { if (!envoi) { setF({ type: '', beneficiaire: '', commentaire: '' }); setErreurs({}); onClose() } }

  const envoyer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!type) e.type_document_uuid = 'Choisissez le document demandé.'
    if (pourApprenant && !beneficiaire) e.beneficiaire_apprenant_uuid = 'Choisissez l\'apprenant concerné.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const r = await demandesService.soumettre({
        type_document_uuid: type.uuid,
        ...(pourApprenant ? { beneficiaire_apprenant_uuid: beneficiaire } : {}),
        ...(f.commentaire.trim() ? { commentaire: f.commentaire.trim() } : {}),
      })
      const d = r?.data
      if (d?.statut === 'bloquee') notify.warning('Demande bloquée', r?.message ?? d.motif_blocage)
      else notify.success('Demande enregistrée', r?.message)
      setF({ type: '', beneficiaire: '', commentaire: '' })
      onClose()
      if (d) onCree(d)
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Nouvelle demande de document" subtitle="L'éligibilité est vérifiée immédiatement ; vous suivez ensuite chaque étape."
      onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-demande" className="ap-btn" disabled={envoi || !disponibles.length}>{envoi ? 'Envoi…' : 'Envoyer la demande'}</button>
        </>
      )}>
      {disponibles.length === 0 ? (
        <p className="ap-hint">Aucun document n'est proposé à votre profil pour le moment.</p>
      ) : (
        <form id="ev-form-demande" className="ev ev-form" onSubmit={envoyer} noValidate>
          <Champ id="ev-nd-type" label="Document" requis erreur={erreurs.type_document_uuid} aide={type?.description || (type?.delai_indicatif_jours != null ? `Délai indicatif : ${type.delai_indicatif_jours} jour(s).` : undefined)}>
            <select {...aria('ev-nd-type', erreurs.type_document_uuid, !!type)} className="ap-input" value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}>
              <option value="">Choisir un document</option>
              {disponibles.map((t) => <option key={t.uuid} value={t.uuid}>{t.nom}</option>)}
            </select>
          </Champ>
          {pourApprenant && (
            <Champ id="ev-nd-benef" label="Apprenant concerné" requis erreur={erreurs.beneficiaire_apprenant_uuid}>
              <select {...aria('ev-nd-benef', erreurs.beneficiaire_apprenant_uuid)} className="ap-input" value={beneficiaire} disabled={apprenants.chargement}
                onChange={(e) => setF((x) => ({ ...x, beneficiaire: e.target.value }))}>
                <option value="">{apprenants.chargement ? 'Chargement…' : liste.length ? 'Choisir' : 'Aucun dossier rattaché à votre compte'}</option>
                {liste.map((a) => <option key={a.uuid} value={a.uuid}>{nomBeneficiaire(a)}</option>)}
              </select>
            </Champ>
          )}
          <Champ id="ev-nd-com" label="Précisions" erreur={erreurs.commentaire} aide="Facultatif : nombre d'exemplaires, usage du document…">
            <textarea {...aria('ev-nd-com', erreurs.commentaire, true)} className="ap-textarea" rows={4} maxLength={1000} value={f.commentaire}
              placeholder="Exemple : 2 exemplaires pour un dossier de bourse." onChange={(e) => setF((x) => ({ ...x, commentaire: e.target.value }))} />
          </Champ>
        </form>
      )}
    </Drawer>
  )
}
