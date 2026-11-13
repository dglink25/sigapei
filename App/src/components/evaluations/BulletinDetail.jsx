import { useState } from 'react'
import { Download, Flag, Info } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { STATUTS_NOTE } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import { aria, Badge, Champ, erreursChamps, formatDate, formatNombre } from '../modules/outils'

/** Texte d'une note dans le bulletin : valeur (sur barème si différent de 20), niveau ou statut d'absence. */
const texteNote = (n) => {
  if (n.statut === 'non_saisie') return 'Non saisie'
  if (n.statut !== 'saisie') return STATUTS_NOTE.find((s) => s.code === n.statut)?.libelle ?? n.statut
  if (n.niveau_competence) return n.niveau_competence
  const sur = Number(n.note_sur)
  return `${formatNombre(n.valeur)}${sur && sur !== 20 ? `/${formatNombre(sur)}` : ''}`
}

/**
 * Bulletin d'un apprenant pour une période : provisoire (calcul en direct) tant que la période est ouverte,
 * archivé (version figée, PDF) après la clôture. `peutContester` : apprenant ou parent rattaché.
 */
export default function BulletinDetail({ bulletin, periodeUuid, peutContester = false, onContestee }) {
  const notify = useNotify()
  const [telechargement, setTelechargement] = useState(false)
  const [contestation, setContestation] = useState(null)
  const b = bulletin

  const telecharger = async () => {
    setTelechargement(true)
    try {
      await evaluationsService.telechargerBulletin(b.apprenant.uuid, periodeUuid)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setTelechargement(false)
    }
  }

  return (
    <div className="ev ev-large" style={{ gap: 14 }}>
      <div className="ev-entete">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{[b.apprenant?.nom, b.apprenant?.prenom].filter(Boolean).join(' ')}</h3>
          <p className="ap-page-sub" style={{ margin: '4px 0 0' }}>
            {b.classe?.nom ?? '-'} - {b.periode?.libelle} {b.periode?.annee_scolaire}
            {b.apprenant?.matricule ? ` - Matricule ${b.apprenant.matricule}` : ''}
          </p>
        </div>
        <div className="ev-actions">
          {b.provisoire
            ? <Badge ton="info">Provisoire : la période n'est pas clôturée</Badge>
            : (
              <button type="button" className="ap-btn ap-btn--sm" onClick={telecharger} disabled={telechargement}>
                <Download size={15} aria-hidden="true" /> {telechargement ? 'Préparation…' : 'Télécharger le PDF'}
              </button>
            )}
        </div>
      </div>

      <div className="ev-synthese">
        <div className="ev-chiffre"><span>Moyenne générale</span><strong>{formatNombre(b.moyenne)}</strong></div>
        {b.rang != null && <div className="ev-chiffre"><span>Rang</span><strong>{b.rang}{b.ex_aequo ? ' ex æquo' : ''} / {b.effectif}</strong></div>}
        <div className="ev-chiffre"><span>Moyenne de la classe</span><strong>{formatNombre(b.moyenne_classe)}</strong></div>
        <div className="ev-chiffre"><span>Appréciation</span><strong style={{ fontSize: '1.05rem' }}>{b.mention ?? '-'}</strong></div>
      </div>

      <div className="ap-card ap-card--flush ev-table-wrap">
        <table className="ap-table">
          <caption className="ap-sr">Résultats par matière</caption>
          <thead>
            <tr>
              <th scope="col">Matière</th><th scope="col" className="ev-num">Coef.</th><th scope="col">Notes</th>
              <th scope="col" className="ev-num">Moyenne</th><th scope="col" className="ev-num">Classe</th><th scope="col">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {(b.matieres ?? []).map((m) => (
              <tr key={m.matiere_uuid}>
                <th scope="row" style={{ textAlign: 'left' }}>{m.matiere_nom}</th>
                <td className="ev-num">{formatNombre(m.coefficient)}</td>
                <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                  <span className="ev-notes-liste">
                    {(m.notes ?? []).map((n) => {
                      const libelle = `${n.evaluation_libelle ?? 'Évaluation'} : ${texteNote(n)}`
                      const ecartee = n.statut === 'saisie' && n.retenue === false
                      return peutContester && n.note_uuid && n.statut !== 'non_saisie' ? (
                        <button key={n.evaluation_uuid} type="button" className={`ev-pastille${ecartee ? ' is-ecartee' : ''}`}
                          title="Contester cette note" onClick={() => setContestation({ note: n, matiere: m.matiere_nom })}>
                          {libelle} <Flag size={12} aria-hidden="true" />
                        </button>
                      ) : (
                        <span key={n.evaluation_uuid} className={`ev-pastille${ecartee ? ' is-ecartee' : ''}`}
                          title={ecartee ? 'Note non retenue (rattrapage)' : undefined}>{libelle}</span>
                      )
                    })}
                  </span>
                </td>
                <td className="ev-num ev-fort">{formatNombre(m.moyenne)}</td>
                <td className="ev-num ev-muet">{formatNombre(m.moyenne_classe)}</td>
                <td>{m.mention ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Array.isArray(b.versions) && b.versions.length > 1 && (
        <div className="ap-alert" style={{ background: 'var(--sg-surface-2)', borderColor: 'var(--sg-border)' }}>
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Bulletin rectifié</strong>
            Version {b.version} du {formatDate(b.genere_le)}{b.motif_version ? ` : ${b.motif_version}` : ''}. Le PDF correspond à la dernière version.
          </div>
        </div>
      )}

      {peutContester && (
        <Contestation cible={contestation} onClose={() => setContestation(null)} onContestee={onContestee} />
      )}
    </div>
  )
}

function Contestation({ cible, onClose, onContestee }) {
  const notify = useNotify()
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  const fermer = () => { if (!envoi) { setMotif(''); setErreur(null); onClose() } }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (motif.trim().length < 10) { setErreur('Expliquez la raison en 10 caractères au moins.'); return }
    setEnvoi(true)
    try {
      await evaluationsService.contester(cible.note.note_uuid, motif.trim())
      notify.success('Contestation envoyée', "L'enseignant va l'examiner. Vous suivrez la réponse dans « Mes contestations ».")
      setMotif('')
      setErreur(null)
      onClose()
      onContestee?.()
    } catch (err) {
      setErreur(erreursChamps(err).motif ?? null)
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={!!cible} title="Contester une note" subtitle={cible ? `${cible.matiere} - ${cible.note.evaluation_libelle ?? 'Évaluation'} : ${texteNote(cible.note)}` : undefined}
      onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-contestation" className="ap-btn" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer'}</button>
        </>
      )}>
      <form id="ev-form-contestation" className="ev ev-form" onSubmit={envoyer} noValidate>
        <Champ id="ev-ct-motif" label="Motif" requis erreur={erreur} aide="Soyez précis : question concernée, élément oublié, erreur de calcul…">
          <textarea {...aria('ev-ct-motif', erreur, true)} className="ap-textarea" rows={5} maxLength={2000} value={motif}
            placeholder="Exemple : la question 3 de ma copie n'a pas été comptée dans le total."
            onChange={(e) => setMotif(e.target.value)} />
        </Champ>
      </form>
    </Drawer>
  )
}
