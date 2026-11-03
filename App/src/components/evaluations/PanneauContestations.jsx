import { useState } from 'react'
import { MessageSquareWarning, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { STATUTS_CONTESTATION, STATUTS_NOTE, formatDate, formatNombre } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, useDonnees } from './communs'

const texteNote = (n) => (!n ? '-' : n.statut !== 'saisie' ? STATUTS_NOTE.find((s) => s.code === n.statut)?.libelle : formatNombre(n.valeur))

/**
 * Contestations de notes.
 *  - apprenant / parent : les siennes, avec la réponse ;
 *  - enseignant : celles de ses évaluations ; administrateur : toutes (y compris escaladées). Ils les traitent.
 */
export default function PanneauContestations({ role }) {
  const notify = useNotify()
  const gestion = role === 'administrateur' || role === 'enseignant'
  const [statut, setStatut] = useState(gestion ? 'ouverte' : '')
  const [page, setPage] = useState(1)
  const liste = useDonnees(() => evaluationsService.contestations({ statut, page, par_page: 20 }), [statut, page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const [traitee, setTraitee] = useState(null)

  const elements = liste.donnees?.elements ?? []

  return (
    <section className="ev" aria-labelledby="ev-titre-contestations">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-contestations">{gestion ? 'Contestations de notes' : 'Mes contestations'}</h2>
          <p className="ap-page-sub">
            {gestion
              ? 'Examinez chaque demande et répondez. Une note se corrige par l\'administration, avec un motif.'
              : 'Suivez vos demandes de vérification de note et la réponse de l\'établissement.'}
          </p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
        </div>
      </div>

      <div className="ap-filters" role="tablist" aria-label="Statut">
        {[['', 'Toutes'], ...Object.entries(STATUTS_CONTESTATION).map(([k, v]) => [k, v.libelle])].map(([k, l]) => (
          <button key={k || 'toutes'} type="button" role="tab" aria-selected={statut === k}
            className={`ap-tab${statut === k ? ' is-active' : ''}`} onClick={() => { setStatut(k); setPage(1) }}>{l}</button>
        ))}
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement des contestations…" /> : elements.length === 0 ? (
        <EtatVide icone={MessageSquareWarning} titre="Aucune contestation" texte={gestion ? 'Aucune demande dans cette catégorie.' : 'Pour contester une note, ouvrez votre bulletin et touchez la note concernée.'} />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Contestations</caption>
              <thead>
                <tr>
                  <th scope="col">Ouverte le</th><th scope="col">Évaluation</th><th scope="col" className="ev-num">Note</th>
                  <th scope="col">Motif</th><th scope="col">Statut</th><th scope="col">Réponse</th>
                  {gestion && <th scope="col"><span className="ap-sr">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {elements.map((c) => {
                  const s = STATUTS_CONTESTATION[c.statut] ?? { libelle: c.statut, badge: 'neutral' }
                  const terminee = c.statut === 'resolue' || c.statut === 'rejetee'
                  return (
                    <tr key={c.uuid}>
                      <td>{formatDate(c.ouverte_le)}</td>
                      <td>{c.note?.evaluation?.libelle ?? '-'}</td>
                      <td className="ev-num">{texteNote(c.note)}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 220, maxWidth: 360 }}>{c.motif}</td>
                      <td>
                        <Badge ton={s.badge}>{s.libelle}</Badge>
                        {c.escaladee_le && !terminee && <small>Signalée à l'administration</small>}
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 180, maxWidth: 320 }}>{c.reponse || <span className="ev-muet">En attente</span>}</td>
                      {gestion && (
                        <td style={{ textAlign: 'right' }}>
                          {!terminee && <button type="button" className="ap-btn ap-btn--sm" onClick={() => setTraitee(c)}>Traiter</button>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={setPage} unite="contestation" />
        </div>
      )}

      {gestion && <Traitement cible={traitee} onClose={() => setTraitee(null)} onTraitee={liste.recharger} />}
    </section>
  )
}

function Traitement({ cible, onClose, onTraitee }) {
  const notify = useNotify()
  const [statut, setStatut] = useState('resolue')
  const [reponse, setReponse] = useState('')
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)

  const fermer = () => { if (!envoi) { setStatut('resolue'); setReponse(''); setErreurs({}); onClose() } }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (statut !== 'en_examen' && reponse.trim().length < 5) {
      setErreurs({ reponse: 'Une réponse est attendue pour clore la contestation.' })
      return
    }
    setEnvoi(true)
    try {
      await evaluationsService.traiterContestation(cible.uuid, { statut, reponse: reponse.trim() || null })
      notify.success('Contestation mise à jour', STATUTS_CONTESTATION[statut].libelle)
      setReponse('')
      setErreurs({})
      onClose()
      onTraitee()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={!!cible} title="Traiter la contestation" subtitle={cible ? `${cible.note?.evaluation?.libelle ?? 'Évaluation'} - note : ${texteNote(cible.note)}` : undefined}
      onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-traitement" className="ap-btn" disabled={envoi}>{envoi ? 'Envoi…' : 'Valider'}</button>
        </>
      )}>
      {cible && (
        <form id="ev-form-traitement" className="ev ev-form" onSubmit={envoyer} noValidate>
          <div className="ap-field">
            <span className="ap-label">Motif de la demande</span>
            <p style={{ margin: 0, lineHeight: 1.55 }}>{cible.motif}</p>
          </div>
          <Champ id="ev-t-statut" label="Décision" requis>
            <select {...aria('ev-t-statut')} className="ap-input" value={statut} onChange={(e) => setStatut(e.target.value)}>
              {cible.statut === 'ouverte' && <option value="en_examen">Mettre en examen</option>}
              <option value="resolue">Résolue (la demande est fondée)</option>
              <option value="rejetee">Rejetée (la note est maintenue)</option>
            </select>
          </Champ>
          <Champ id="ev-t-reponse" label="Réponse" requis={statut !== 'en_examen'} erreur={erreurs.reponse}
            aide={statut === 'resolue' ? 'Si la note doit changer, l\'administration la corrigera avec un motif.' : undefined}>
            <textarea {...aria('ev-t-reponse', erreurs.reponse, statut === 'resolue')} className="ap-textarea" rows={5} maxLength={2000} value={reponse}
              placeholder="Exemple : après vérification de la copie, la question 3 a bien été comptée."
              onChange={(e) => setReponse(e.target.value)} />
          </Champ>
        </form>
      )}
    </Drawer>
  )
}
