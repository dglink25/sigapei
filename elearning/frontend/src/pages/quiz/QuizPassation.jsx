import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  useDemarrerTentative,
  useQuiz,
  useSoumettreTentative,
} from '../../api/quiz.js'
import { messageErreur } from '../../api/client.js'
import { BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Markdown } from '../../components/Markdown.jsx'
import { SqueletteTexte } from '../../components/Squelette.jsx'
import { useProfilStore } from '../../stores/profil.js'
import { formaterNombre } from '../../utils/format.js'

/** Secondes → mm:ss pour l'affichage du chrono. */
function formaterChrono(secondes) {
  const minutes = Math.floor(secondes / 60)
  const reste = secondes % 60
  return `${String(minutes).padStart(2, '0')}:${String(reste).padStart(2, '0')}`
}

/** Réponses au format attendu par l'API :
 * qcm → chaîne JSON des UUID des options choisies ;
 * vrai_faux → UUID de l'option choisie ; ouverte → texte libre. */
function construireReponses(questions, reponses) {
  return questions.map((question) => ({
    question: question.uuid,
    reponse_donnee:
      question.type === 'qcm'
        ? JSON.stringify(reponses[question.uuid] ?? [])
        : String(reponses[question.uuid] ?? ''),
  }))
}

/** Question telle que présentée pendant le passage : cases à cocher pour
 * un QCM, boutons radio pour un vrai/faux, zone de texte pour l'ouverte. */
function QuestionPassage({ question, numero, reponse, onMaj }) {
  function majQcm(optionUuid, cocher) {
    const ensemble = new Set(reponse ?? [])
    if (cocher) ensemble.add(optionUuid)
    else ensemble.delete(optionUuid)
    onMaj([...ensemble])
  }

  return (
    <article className="element">
      <div className="element-tete">
        <h3>Question {numero}</h3>
        <BadgeStatut valeur={question.type} />
        <span className="texte-efface">
          Barème : {formaterNombre(question.bareme)} point(s)
        </span>
      </div>
      <Markdown contenu={question.enonce} />

      {question.type === 'qcm' && (
        <div className="liste-options">
          {(question.options ?? []).map((option) => (
            <label key={option.uuid} className="option-reponse">
              <input
                type="checkbox"
                checked={(reponse ?? []).includes(option.uuid)}
                onChange={(e) => majQcm(option.uuid, e.target.checked)}
              />
              {option.libelle}
            </label>
          ))}
        </div>
      )}

      {question.type === 'vrai_faux' && (
        <div className="liste-options">
          {(question.options ?? []).map((option) => (
            <label key={option.uuid} className="option-reponse">
              <input
                type="radio"
                name={`question-${question.uuid}`}
                checked={reponse === option.uuid}
                onChange={() => onMaj(option.uuid)}
              />
              {option.libelle}
            </label>
          ))}
        </div>
      )}

      {question.type === 'ouverte' && (
        <div className="champ">
          <label htmlFor={`reponse-${question.uuid}`}>
            Votre réponse
          </label>
          <textarea
            id={`reponse-${question.uuid}`}
            rows={4}
            value={reponse ?? ''}
            onChange={(e) => onMaj(e.target.value)}
            placeholder="Rédigez votre réponse…"
          />
        </div>
      )}
    </article>
  )
}

export function QuizPassation() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)

  const [apprenantId, setApprenantId] = useState('')
  // { tentative, questions, chrono } une fois la tentative démarrée.
  const [passage, setPassage] = useState(null)
  const [reponses, setReponses] = useState({})
  const [secondes, setSecondes] = useState(null)

  const quiz = useQuiz(uuid)
  const demarrer = useDemarrerTentative(uuid)
  const soumission = useSoumettreTentative()

  useEffect(() => {
    if (apprenantProfil) setApprenantId(apprenantProfil)
  }, [apprenantProfil])

  // Dernier état des réponses, lisible par la soumission automatique.
  const reponsesRef = useRef({})
  useEffect(() => {
    reponsesRef.current = reponses
  }, [reponses])

  const envoyer = useCallback(
    (uuidTentative, reponsesFinal) => {
      soumission.mutate(
        { uuidTentative, reponses: reponsesFinal },
        { onSuccess: () => navigate(`/tentatives/${uuidTentative}`) },
      )
    },
    [soumission, navigate],
  )

  function commencer(evenement) {
    evenement.preventDefault()
    demarrer.mutate(
      { apprenant_id: apprenantId, soumis_par: apprenantId },
      {
        onSuccess: (resultat) =>
          setPassage({
            ...resultat,
            chrono: quiz.data?.chrono_secondes ?? null,
          }),
      },
    )
  }

  // Chrono décompté dès le démarrage de la tentative.
  useEffect(() => {
    if (!passage?.chrono) return
    setSecondes(passage.chrono)
    const minuteur = setInterval(() => {
      setSecondes((etat) => Math.max(0, etat - 1))
    }, 1000)
    return () => clearInterval(minuteur)
  }, [passage])

  // Soumission automatique quand le chrono atteint zéro.
  useEffect(() => {
    if (
      secondes === 0 &&
      passage &&
      !soumission.isPending &&
      !soumission.isSuccess &&
      !soumission.isError
    ) {
      envoyer(
        passage.tentative.uuid,
        construireReponses(passage.questions, reponsesRef.current),
      )
    }
  }, [
    secondes,
    passage,
    soumission.isPending,
    soumission.isSuccess,
    soumission.isError,
    envoyer,
  ])

  if (quiz.isPending) {
    return (
      <>
        <h1>Chargement du quiz…</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (quiz.isError) {
    return <ErreurApi erreur={quiz.error} reessayer={() => quiz.refetch()} />
  }

  const donnees = quiz.data
  const questions = passage?.questions ?? []

  function soumettreManuellement(evenement) {
    evenement.preventDefault()
    envoyer(passage.tentative.uuid, construireReponses(passage.questions, reponses))
  }

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to="/quiz">Quiz & QCM</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to={`/quiz/${uuid}`}>{donnees.titre}</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Passation</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>Passer : {donnees.titre}</h1>
          <div className="actions-ligne">
            <span className="badge badge-texte">Passation</span>
            <BadgeStatut valeur={donnees.restitution} />
            <span className="badge badge-texte">
              {donnees.nb_questions} question(s) -{' '}
              {donnees.tentatives_max === null
                ? 'tentatives illimitées'
                : `${donnees.tentatives_max} tentative(s) max`}
              {donnees.chrono_secondes
                ? ` - chrono ${Math.round(donnees.chrono_secondes / 60)} min`
                : ''}
            </span>
          </div>
        </div>
        <Link to={`/quiz/${uuid}`} className="bouton bouton-secondaire">
          Retour au quiz
        </Link>
      </div>

      {donnees.statut !== 'publie' && (
        <p className="alerte alerte-avertissement">
          Ce quiz n'est pas publié ; le passage reste possible ici pour tester
          la mécanique des tentatives.
        </p>
      )}

      {passage ? (
        <form className="section" onSubmit={soumettreManuellement}>
          {passage.chrono && (
            <p
              className={`alerte ${
                secondes !== null && secondes <= 30
                  ? 'alerte-erreur'
                  : 'alerte-info'
              }`}
            >
              Temps restant : {formaterChrono(secondes ?? 0)} - à zéro, la
              soumission est automatique.
            </p>
          )}

          <div className="liste-elements">
            {questions.map((question, index) => (
              <QuestionPassage
                key={question.uuid}
                question={question}
                numero={index + 1}
                reponse={reponses[question.uuid]}
                onMaj={(valeur) =>
                  setReponses((etat) => ({ ...etat, [question.uuid]: valeur }))
                }
              />
            ))}
          </div>

          <div className="actions-ligne">
            <button
              type="submit"
              className="bouton bouton-primaire"
              disabled={soumission.isPending}
            >
              {soumission.isPending ? (
                <>
                  <span className="roue" aria-hidden="true" /> Soumission…
                </>
              ) : (
                'Soumettre mes réponses'
              )}
            </button>
          </div>
          {soumission.isError && (
            <p className="erreur-champ" role="alert">
              {messageErreur(soumission.error)}
            </p>
          )}
        </form>
      ) : (
        <form className="carte formulaire" onSubmit={commencer}>
          <h2>Démarrer une tentative</h2>
          <div className="champ">
            <label htmlFor="passation-apprenant">
              Apprenant - UUID (scolarite.apprenants) *
            </label>
            <input
              id="passation-apprenant"
              type="text"
              value={apprenantId}
              onChange={(e) => setApprenantId(e.target.value)}
              required
            />
          </div>
          {donnees.restitution === 'differee' && (
            <p className="alerte alerte-info">
              Restitution différée : vos résultats seront visibles après
              validation de l'enseignant.
            </p>
          )}
          <p className="aide">
            Les questions sont présentées sans les réponses correctes. Le
            chronomètre, s'il y en a un, démarre au lancement de la tentative.
          </p>
          <button
            type="submit"
            className="bouton bouton-primaire"
            disabled={demarrer.isPending}
          >
            {demarrer.isPending ? (
              <>
                <span className="roue" aria-hidden="true" /> Démarrage…
              </>
            ) : (
              'Commencer'
            )}
          </button>
          {demarrer.isError && (
            <p className="erreur-champ" role="alert">
              {messageErreur(demarrer.error)}
            </p>
          )}
        </form>
      )}
    </>
  )
}
