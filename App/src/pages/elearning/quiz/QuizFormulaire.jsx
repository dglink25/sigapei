import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useCreationQuiz, useMajQuiz, useQuiz } from '../../../services/elearning/quiz.js'
import { messageErreur } from '../../../services/elearning/client.js'
import { BarreProgression } from '../../../components/elearning/BarreProgression.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { Interrupteur } from '../../../components/elearning/Interrupteur.jsx'
import { SqueletteTexte } from '../../../components/elearning/Squelette.jsx'
import { StepperDuree } from '../../../components/elearning/StepperDuree.jsx'
import { useProfilStore } from '../../../context/elearning/profil.js'

/** En-tête de section numérotée (formulaires en étapes). */
function TitreSection({ numero, children, aide }) {
  return (
    <div className="element-tete" style={{ marginBottom: '0.75rem' }}>
      <span className="numero-etape">{numero}</span>
      <h2 style={{ margin: 0 }}>{children}</h2>
      {aide && <span className="texte-efface">{aide}</span>}
    </div>
  )
}

/** Grand choix cliquable (tentatives, restitution). */
function GrandChoix({ actif, titre, sous, onChoisir }) {
  const classes = ['grand-choix']
  if (actif) classes.push('grand-choix-actif')
  return (
    <button type="button" className={classes.join(' ')} onClick={onChoisir}>
      <span className="grand-choix-titre">{titre}</span>
      <span className="grand-choix-sous">{sous}</span>
    </button>
  )
}

export function QuizFormulaire() {
  const { uuid } = useParams()
  const edition = Boolean(uuid)
  const navigate = useNavigate()

  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  // État du formulaire
  const [titre, setTitre] = useState('')
  const [matiereId, setMatiereId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [tentativesChoix, setTentativesChoix] = useState('1') // '1' | '2' | 'illimite'
  const [chronoActif, setChronoActif] = useState(false)
  const [chronoMinutes, setChronoMinutes] = useState(30)
  const [restitution, setRestitution] = useState('immediate')
  const [dateLimite, setDateLimite] = useState('')
  const [ordreAleatoire, setOrdreAleatoire] = useState(false)
  const [melangerOptions, setMelangerOptions] = useState(false)
  const [seuilValidation, setSeuilValidation] = useState('10')
  const [statut, setStatut] = useState('brouillon')
  const [statutVise, setStatutVise] = useState(null) // null = garder le statut du select

  const quiz = useQuiz(uuid, { enabled: edition })
  const creation = useCreationQuiz()
  const maj = useMajQuiz()

  useEffect(() => {
    if (quiz.data) {
      setTitre(quiz.data.titre)
      setMatiereId(quiz.data.matiere_id ?? '')
      setClasseId(quiz.data.classe_id ?? '')
      setTentativesChoix(
        quiz.data.tentatives_max === null || quiz.data.tentatives_max === undefined
          ? 'illimite'
          : String(quiz.data.tentatives_max),
      )
      setChronoActif(Boolean(quiz.data.chrono_secondes))
      setChronoMinutes(
        quiz.data.chrono_secondes
          ? Math.max(5, Math.round(quiz.data.chrono_secondes / 60))
          : 30,
      )
      setRestitution(quiz.data.restitution ?? 'immediate')
      setDateLimite(
        quiz.data.date_limite ? quiz.data.date_limite.slice(0, 16) : '',
      )
      setOrdreAleatoire(Boolean(quiz.data.ordre_aleatoire_questions))
      setMelangerOptions(Boolean(quiz.data.melanger_options))
      setSeuilValidation(String(quiz.data.seuil_validation ?? 10))
      setStatut(quiz.data.statut)
    }
  }, [quiz.data])

  useEffect(() => {
    if (!edition) {
      setMatiereId(matiereProfil)
      setClasseId(classeProfil)
    }
  }, [edition, matiereProfil, classeProfil])

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = {
      titre,
      matiere_id: matiereId,
      classe_id: classeId,
      tentatives_max:
        tentativesChoix === 'illimite' ? null : Number(tentativesChoix),
      chrono_secondes: chronoActif ? chronoMinutes * 60 : null,
      restitution,
      date_limite: dateLimite ? new Date(dateLimite).toISOString() : null,
      ordre_aleatoire_questions: ordreAleatoire,
      melanger_options: melangerOptions,
      seuil_validation: seuilValidation === '' ? null : Number(seuilValidation),
      statut: statutVise ?? statut,
    }
    setStatutVise(null)

    if (edition) {
      maj.mutate(
        { uuid, donnees },
        { onSuccess: () => navigate(`/quiz/${uuid}`) },
      )
    } else {
      creation.mutate(donnees, {
        onSuccess: (nouveauQuiz) => navigate(`/quiz/${nouveauQuiz.uuid}`),
      })
    }
  }

  if (edition && quiz.isPending) {
    return (
      <>
        <h1>Chargement du quiz…</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (edition && quiz.isError) {
    return <ErreurApi erreur={quiz.error} reessayer={() => quiz.refetch()} />
  }

  const mutation = edition ? maj : creation

  return (
    <>
      {/* Bandeau collant : étape 1 sur 2 + actions */}
      <div className="bandeau-sticky">
        <div className="titre-page">
          <div>
            <h1>{edition ? 'Modifier le quiz' : 'Nouveau quiz'}</h1>
            <span className="badge badge-brouillon">
              Étape 1 sur 2 - Paramètres
            </span>
          </div>
          <div className="actions-ligne">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={() => navigate(-1)}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="formulaire-quiz"
              className="bouton bouton-primaire"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="roue" aria-hidden="true" /> Enregistrement…
                </>
              ) : (
                <>
                  <Icone nom="arrow_forward" />
                  Suivant - questions
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="element-tete" style={{ marginBottom: '1rem' }}>
        <BarreProgression valeur={50} libelle="Étape 1 sur 2" />
        <span className="texte-efface">Les questions s'ajoutent à l'étape 2</span>
      </div>

      <form id="formulaire-quiz" className="carte formulaire" onSubmit={soumettre}>
        <section>
          <TitreSection numero={1} aide="Identité du quiz">
            Paramètres généraux
          </TitreSection>

          <div className="champ">
            <label htmlFor="quiz-titre">Titre *</label>
            <input
              id="quiz-titre"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex. QCM - Chapitre 3 : les fractions"
              required
            />
          </div>

          <div className="grille-2-colonnes">
            <div className="champ">
              <label htmlFor="quiz-matiere">
                Discipline - UUID *
              </label>
              <input
                id="quiz-matiere"
                type="text"
                value={matiereId}
                onChange={(e) => setMatiereId(e.target.value)}
                placeholder={matiereProfil || 'Matière'}
                required
              />
            </div>
            <div className="champ">
              <label htmlFor="quiz-classe">
                Classe *
              </label>
              <input
                id="quiz-classe"
                type="text"
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
                placeholder={classeProfil || 'Classe'}
                required
              />
            </div>
          </div>
        </section>

        <section className="section">
          <TitreSection numero={2} aide="Tentatives, chrono, restitution">
            Règles du jeu
          </TitreSection>

          <div className="champ">
            <label>Nombre de tentatives autorisées</label>
            <div className="grands-choix">
              <GrandChoix
                actif={tentativesChoix === '1'}
                titre="Stricte"
                sous="Une seule tentative"
                onChoisir={() => setTentativesChoix('1')}
              />
              <GrandChoix
                actif={tentativesChoix === '2'}
                titre="Moyenne"
                sous="Deux tentatives"
                onChoisir={() => setTentativesChoix('2')}
              />
              <GrandChoix
                actif={tentativesChoix === 'illimite'}
                titre="Illimité"
                sous="Quiz d'entraînement"
                onChoisir={() => setTentativesChoix('illimite')}
              />
            </div>
          </div>

          <div className="champ">
            <Interrupteur
              nom="quiz-chrono"
              libelle="Chronomètre limité"
              coche={chronoActif}
              onChange={setChronoActif}
            />
            {chronoActif && (
              <div className="carte-interieure">
                <span className="texte-efface">
                  Durée accordée aux apprenants :
                </span>
                <StepperDuree minutes={chronoMinutes} onChange={setChronoMinutes} />
              </div>
            )}
          </div>

          <div className="champ">
            <label>Restitution des résultats</label>
            <div className="grands-choix">
              <GrandChoix
                actif={restitution === 'immediate'}
                titre="Immédiate"
                sous="Note visible dès la soumission"
                onChoisir={() => setRestitution('immediate')}
              />
              <GrandChoix
                actif={restitution === 'apres_date_limite'}
                titre="Après date limite"
                sous="Verrouillée jusqu'à la clôture"
                onChoisir={() => setRestitution('apres_date_limite')}
              />
              <GrandChoix
                actif={restitution === 'differee'}
                titre="Après validation"
                sous="L'enseignant relit avant publication"
                onChoisir={() => setRestitution('differee')}
              />
            </div>
            <p className="aide">
              Les questions ouvertes passent par la correction IA ; l'enseignant
              peut toujours ajuster chaque note.
            </p>
          </div>
        </section>

        <section className="section">
          <TitreSection numero={3} aide="Fenêtre de passage et notation">
            Disponibilité & notation
          </TitreSection>

          <div className="grille-2-colonnes">
            <div className="champ">
              <label htmlFor="quiz-date-limite">Date limite de passage</label>
              <input
                id="quiz-date-limite"
                type="datetime-local"
                value={dateLimite}
                onChange={(e) => setDateLimite(e.target.value)}
              />
              <p className="aide">
                Laisser vide : le quiz reste ouvert sans échéance.
              </p>
            </div>
            <div className="champ">
              <label htmlFor="quiz-seuil">Seuil de validation (note /20)</label>
              <input
                id="quiz-seuil"
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={seuilValidation}
                onChange={(e) => setSeuilValidation(e.target.value)}
              />
              <p className="aide">
                En dessous de cette note, la tentative est marquée non validée.
              </p>
            </div>
          </div>

          <div className="grille-2-colonnes">
            <div className="champ">
              <Interrupteur
                nom="quiz-ordre"
                libelle="Ordre des questions aléatoire"
                coche={ordreAleatoire}
                onChange={setOrdreAleatoire}
              />
            </div>
            <div className="champ">
              <Interrupteur
                nom="quiz-options"
                libelle="Mélanger les options de réponse"
                coche={melangerOptions}
                onChange={setMelangerOptions}
              />
            </div>
          </div>

          <div className="champ">
            <label htmlFor="quiz-statut">Statut</label>
            <select
              id="quiz-statut"
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
            >
              <option value="brouillon">Brouillon (passage impossible)</option>
              <option value="publie">Publié</option>
              {edition && <option value="archive">Archivé</option>}
            </select>
          </div>
        </section>

        <div className="carte carte-creme section">
          <div className="element-tete">
            <Icone nom="quiz" />
            <strong>Étape 2 - structure des questions</strong>
          </div>
          <p className="texte-efface" style={{ margin: '0.4rem 0 0' }}>
            Après enregistrement, vous arriverez sur la page du quiz pour
            composer les questions (QCM, vrai/faux ou ouvertes à correction IA).
          </p>
        </div>

        <div className="actions-ligne section">
          <button
            type="submit"
            className="bouton bouton-vert"
            disabled={mutation.isPending}
          >
            {edition ? 'Enregistrer et voir les questions' : 'Créer le quiz'}
          </button>
          <button
            type="submit"
            className="bouton bouton-secondaire"
            onClick={() => setStatutVise('brouillon')}
            disabled={mutation.isPending}
          >
            Enregistrer brouillon
          </button>
        </div>

        {mutation.isError && (
          <p className="erreur-champ section" role="alert">
            {messageErreur(mutation.error)}
          </p>
        )}
      </form>
    </>
  )
}
