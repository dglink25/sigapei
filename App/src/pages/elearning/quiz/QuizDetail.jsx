import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAjouterQuestion, useMajQuiz, useQuiz } from '../../../services/elearning/quiz.js'
import { messageErreur } from '../../../services/elearning/client.js'
import { BadgeStatut } from '../../../components/elearning/BadgeStatut.jsx'
import { EditeurMarkdown } from '../../../components/elearning/EditeurMarkdown.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { Markdown } from '../../../components/elearning/Markdown.jsx'
import { SqueletteTexte } from '../../../components/elearning/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../../context/elearning/profil.js'
import { formaterNombre, uuidCourt } from '../../../lib/elearning/format.js'

const TYPES_QUESTION = [
  { valeur: 'qcm', libelle: 'QCM (choix multiples)' },
  { valeur: 'vrai_faux', libelle: 'Vrai / Faux' },
  { valeur: 'ouverte', libelle: 'Question ouverte (correction IA)' },
]

/** Question existante, restituée avec ses options ; les corrections ne
 * sont montrées qu'aux enseignants/admins (pas de fuite vers l'apprenant). */
function QuestionAffichee({ question, numero, correctionsVisibles }) {
  return (
    <article className="element">
      <div className="element-tete">
        <h3>
          {numero}. {question.enonce.slice(0, 60)}
          {question.enonce.length > 60 ? '…' : ''}
        </h3>
        <BadgeStatut valeur={question.type} />
        <span className="texte-efface">
          Barème : {formaterNombre(question.bareme)} point(s)
        </span>
      </div>
      <Markdown contenu={question.enonce} />

      {(question.options ?? []).length > 0 && (
        <ul className="liste-options">
          {(question.options ?? []).map((option) => (
            <li
              key={option.uuid}
              className={
                correctionsVisibles && option.est_correcte
                  ? 'option-correcte'
                  : ''
              }
            >
              {option.libelle}
              {correctionsVisibles && option.est_correcte && ' (Réponse correcte)'}
            </li>
          ))}
        </ul>
      )}

      {question.type === 'ouverte' &&
        correctionsVisibles &&
        question.reponse_reference && (
          <p className="aide">
            Réponse de référence (soumise à la correction IA) :{' '}
            {question.reponse_reference}
          </p>
        )}
    </article>
  )
}

/** Ajout d'une question : QCM à options dynamiques, vrai/faux fixe, ou
 * question ouverte avec réponse de référence pour la correction IA. */
function FormulaireQuestion({ uuidQuiz }) {
  const [type, setType] = useState('qcm')
  const [enonce, setEnonce] = useState('')
  const [bareme, setBareme] = useState('1')
  const [reponseReference, setReponseReference] = useState('')
  const [options, setOptions] = useState([
    { libelle: '', est_correcte: false },
    { libelle: '', est_correcte: false },
  ])
  const [choixVraiFaux, setChoixVraiFaux] = useState('vrai')
  const ajouter = useAjouterQuestion(uuidQuiz)

  function majOption(index, champ, valeur) {
    setOptions((etat) =>
      etat.map((element, position) =>
        position === index ? { ...element, [champ]: valeur } : element,
      ),
    )
  }

  function ajouterOption() {
    setOptions((etat) => [...etat, { libelle: '', est_correcte: false }])
  }

  function retirerOption(index) {
    setOptions((etat) => etat.filter((_, position) => position !== index))
  }

  function reinitialiser() {
    setEnonce('')
    setBareme('1')
    setReponseReference('')
    setOptions([
      { libelle: '', est_correcte: false },
      { libelle: '', est_correcte: false },
    ])
    setChoixVraiFaux('vrai')
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = { type, enonce, bareme }
    if (type === 'ouverte') {
      donnees.reponse_reference = reponseReference
    } else if (type === 'qcm') {
      donnees.options = options.map((option, position) => ({
        libelle: option.libelle,
        est_correcte: option.est_correcte,
        ordre: position + 1,
      }))
    } else {
      donnees.options = [
        { libelle: 'Vrai', est_correcte: choixVraiFaux === 'vrai', ordre: 1 },
        { libelle: 'Faux', est_correcte: choixVraiFaux === 'faux', ordre: 2 },
      ]
    }
    ajouter.mutate(donnees, { onSuccess: reinitialiser })
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre}>
      <h2>Ajouter une question</h2>

      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor="question-type">Type de question</label>
          <select
            id="question-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES_QUESTION.map((element) => (
              <option key={element.valeur} value={element.valeur}>
                {element.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="question-bareme">Barème (points)</label>
          <input
            id="question-bareme"
            type="number"
            min="0"
            step="0.5"
            value={bareme}
            onChange={(e) => setBareme(e.target.value)}
          />
        </div>
      </div>

      <EditeurMarkdown
        libelle="Énoncé *"
        valeur={enonce}
        onChange={setEnonce}
        lignes={4}
      />

      {type === 'ouverte' && (
        <div className="champ">
          <label htmlFor="question-reference">Réponse de référence (correction IA)</label>
          <textarea
            id="question-reference"
            rows={3}
            value={reponseReference}
            onChange={(e) => setReponseReference(e.target.value)}
            placeholder="Attendu de correction communiqué au service IA…"
          />
        </div>
      )}

      {type === 'qcm' && (
        <div className="champ">
          <label>Options (cochez la ou les réponses correctes) *</label>
          {options.map((option, index) => (
            <div key={index} className="selection-media-ligne">
              <input
                type="checkbox"
                checked={option.est_correcte}
                onChange={(e) => majOption(index, 'est_correcte', e.target.checked)}
                aria-label={`Option ${index + 1} correcte`}
              />
              <input
                type="text"
                value={option.libelle}
                onChange={(e) => majOption(index, 'libelle', e.target.value)}
                placeholder={`Option ${index + 1}`}
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="bouton bouton-secondaire bouton-compact"
                  onClick={() => retirerOption(index)}
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="bouton bouton-secondaire bouton-compact"
            onClick={ajouterOption}
          >
            + Ajouter une option
          </button>
        </div>
      )}

      {type === 'vrai_faux' && (
        <div className="champ">
          <label>Bonne réponse</label>
          <div className="actions-ligne">
            <label className="option-reponse">
              <input
                type="radio"
                name="vrai-faux-correct"
                checked={choixVraiFaux === 'vrai'}
                onChange={() => setChoixVraiFaux('vrai')}
              />
              Vrai
            </label>
            <label className="option-reponse">
              <input
                type="radio"
                name="vrai-faux-correct"
                checked={choixVraiFaux === 'faux'}
                onChange={() => setChoixVraiFaux('faux')}
              />
              Faux
            </label>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="bouton bouton-primaire"
        disabled={ajouter.isPending}
      >
        {ajouter.isPending ? (
          <>
            <span className="roue" aria-hidden="true" /> Ajout en cours…
          </>
        ) : (
          'Ajouter la question'
        )}
      </button>
      {ajouter.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(ajouter.error)}
        </p>
      )}
    </form>
  )
}

export function QuizDetail() {
  const { uuid } = useParams()
  const role = useProfilStore((etat) => etat.role)
  const quiz = useQuiz(uuid)
  const maj = useMajQuiz()

  if (quiz.isPending) {
    return (
      <>
        <h1>Chargement du quiz…</h1>
        <SqueletteTexte lignes={8} />
      </>
    )
  }
  if (quiz.isError) {
    return <ErreurApi erreur={quiz.error} reessayer={() => quiz.refetch()} />
  }

  const donnees = quiz.data
  const questions = donnees.questions ?? []
  const correctionsVisibles = peutPublier(role)

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/elearning/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to="/elearning/quiz">Quiz & QCM</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">{donnees.titre}</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>{donnees.titre}</h1>
          <div className="actions-ligne">
            <span className="badge badge-texte">Quiz</span>
            <BadgeStatut valeur={donnees.statut} />
            <BadgeStatut valeur={donnees.restitution} />
            <span className="badge badge-texte">
              Matière {uuidCourt(donnees.matiere_id)} - Classe{' '}
              {uuidCourt(donnees.classe_id)}
            </span>
            <span className="badge badge-texte">
              {questions.length} question(s) -{' '}
              {donnees.tentatives_max === null
                ? 'tentatives illimitées'
                : `${donnees.tentatives_max} tentative(s) max`}
              {donnees.chrono_secondes
                ? ` - chrono ${Math.round(donnees.chrono_secondes / 60)} min`
                : ''}
            </span>
          </div>
        </div>
        <div className="actions-ligne">
          {role === 'apprenant' && donnees.statut === 'publie' && (
            <Link to={`/quiz/${uuid}/passer`} className="bouton bouton-primaire">
              <Icone nom="play_arrow" />
              Passer le quiz
            </Link>
          )}
          {peutPublier(role) && (
            <>
              <Link
                to={`/quiz/${uuid}/modifier`}
                className="bouton bouton-secondaire"
              >
                <Icone nom="edit" />
                Modifier
              </Link>
              {donnees.statut === 'brouillon' && (
                <button
                  type="button"
                  className="bouton bouton-vert"
                  disabled={maj.isPending}
                  onClick={() => maj.mutate({ uuid, donnees: { statut: 'publie' } })}
                >
                  <Icone nom="publish" />
                  Publier
                </button>
              )}
              {donnees.statut !== 'archive' && (
                <button
                  type="button"
                  className="bouton bouton-danger"
                  disabled={maj.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Archiver ce quiz ? Il ne sera pas supprimé ' +
                          '(suppression physique interdite).',
                      )
                    ) {
                      maj.mutate({ uuid, donnees: { statut: 'archive' } })
                    }
                  }}
                >
                  Archiver
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="section">
        <h2>Questions</h2>
        {questions.length === 0 ? (
          <p className="texte-efface">
            Ce quiz n'a pas encore de question.
            {peutPublier(role)
              ? ' Ajoutez la première ci-dessous.'
              : ' Revenez plus tard.'}
          </p>
        ) : (
          <div className="liste-elements">
            {questions.map((question, index) => (
              <QuestionAffichee
                key={question.uuid}
                question={question}
                numero={index + 1}
                correctionsVisibles={correctionsVisibles}
              />
            ))}
          </div>
        )}
        {maj.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(maj.error)}
          </p>
        )}
      </section>

      {peutPublier(role) && <FormulaireQuestion uuidQuiz={uuid} />}
    </>
  )
}
