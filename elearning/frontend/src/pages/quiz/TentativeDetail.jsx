import { useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  useNoterReponse,
  useQuiz,
  useReporterTentative,
  useTentative,
  useValiderTentative,
} from '../../api/quiz.js'
import { messageErreur } from '../../api/client.js'
import { BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Markdown } from '../../components/Markdown.jsx'
import { SqueletteTexte } from '../../components/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../stores/profil.js'
import {
  formaterDateHeure,
  formaterNombre,
  uuidCourt,
} from '../../utils/format.js'

/** Réponse d'un apprenant, restituée avec sa correction. Le libellé des
 * options est retrouvé via les questions du quiz (UUID → libellé). */
function LigneReponse({ reponse, question, peutNoter }) {
  const [note, setNote] = useState(reponse.note_finale ?? reponse.note_ia ?? '')
  const noter = useNoterReponse()

  const type = question?.type
  const optionsQuestion = question?.options ?? []
  const libelleParUuid = new Map(
    optionsQuestion.map((option) => [option.uuid, option.libelle]),
  )

  let uuidsChoisis = []
  if (type === 'qcm') {
    try {
      uuidsChoisis = (JSON.parse(reponse.reponse_donnee || '[]') ?? []).map(
        String,
      )
    } catch {
      uuidsChoisis = []
    }
  } else if (type === 'vrai_faux' && reponse.reponse_donnee) {
    uuidsChoisis = [reponse.reponse_donnee]
  }

  const libellesChoisis = uuidsChoisis.map(
    (valeur) => libelleParUuid.get(valeur) ?? uuidCourt(valeur),
  )
  const bonnesReponses = optionsQuestion
    .filter((option) => option.est_correcte)
    .map((option) => option.libelle)

  function ajuster(evenement) {
    evenement.preventDefault()
    if (note === '') return
    noter.mutate({ uuid: reponse.uuid, noteFinale: note })
  }

  return (
    <article className="element">
      <div className="element-tete">
        <h3>{reponse.enonce.slice(0, 60)}
          {reponse.enonce.length > 60 ? '…' : ''}
        </h3>
        <BadgeStatut valeur={type} />
        <span className="texte-efface">
          Barème : {formaterNombre(reponse.bareme)} point(s)
        </span>
        {reponse.validee_par_enseignant && (
          <span className="badge badge-valide">Validée par l'enseignant</span>
        )}
      </div>
      <Markdown contenu={reponse.enonce} />

      {type === 'ouverte' ? (
        <p className="carte-interieure">
          {reponse.reponse_donnee || 'Aucune réponse rédigée.'}
        </p>
      ) : (
        <p>
          <strong>Réponse donnée :</strong>{' '}
          {libellesChoisis.length > 0 ? libellesChoisis.join(', ') : '-'}
        </p>
      )}

      {bonnesReponses.length > 0 && (
        <p className="aide">
          Réponse(s) correcte(s) : {bonnesReponses.join(', ')}
        </p>
      )}

      <p>
        <strong>Note :</strong>{' '}
        {reponse.note_finale === null
          ? 'en attente'
          : `${formaterNombre(reponse.note_finale)} / ${formaterNombre(reponse.bareme)}`}
        {reponse.note_ia !== null && (
          <> - proposition IA : {formaterNombre(reponse.note_ia)}</>
        )}
      </p>

      {peutNoter && (
        <form className="actions-ligne" onSubmit={ajuster}>
          <span className="champ-inline">
            <input
              type="number"
              step="0.25"
              min="0"
              max={reponse.bareme}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label={`Note finale sur ${reponse.bareme}`}
            />
          </span>
          <button
            type="submit"
            className="bouton bouton-secondaire bouton-compact"
            disabled={noter.isPending}
          >
            {noter.isPending ? '…' : 'Ajuster / valider'}
          </button>
          {noter.isError && (
            <span className="erreur-champ" role="alert">
              {messageErreur(noter.error)}
            </span>
          )}
        </form>
      )}
    </article>
  )
}

export function TentativeDetail() {
  const { uuid } = useParams()
  const role = useProfilStore((etat) => etat.role)
  const tentative = useTentative(uuid)
  const quiz = useQuiz(tentative.data?.quiz_uuid)
  const valider = useValiderTentative()
  const reporter = useReporterTentative()

  if (tentative.isPending) {
    return (
      <>
        <h1>Chargement de la tentative…</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (tentative.isError) {
    return (
      <ErreurApi
        erreur={tentative.error}
        reessayer={() => tentative.refetch()}
      />
    )
  }

  const donnees = tentative.data
  const differee = donnees.restitution === 'differee'
  const reponses = donnees.reponses ?? []
  const questionsParUuid = new Map(
    (quiz.data?.questions ?? []).map((question) => [question.uuid, question]),
  )

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to={`/quiz/${donnees.quiz_uuid}`}>{donnees.quiz_titre}</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Tentative n° {donnees.numero}</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>
            Tentative n° {donnees.numero} - {donnees.quiz_titre}
          </h1>
          <div className="actions-ligne">
            <span className="badge badge-texte">Tentative</span>
            <BadgeStatut valeur={donnees.statut} />
            <span className="badge badge-texte">
              Apprenant {uuidCourt(donnees.apprenant_id)}
            </span>
            <span className="badge badge-texte">
              Commencée le {formaterDateHeure(donnees.date_debut)}
              {donnees.date_soumission
                ? ` - soumise le ${formaterDateHeure(donnees.date_soumission)}`
                : ''}
            </span>
          </div>
        </div>
        <Link
          to={`/quiz/${donnees.quiz_uuid}`}
          className="bouton bouton-secondaire"
        >
          Voir le quiz
        </Link>
      </div>

      {differee ? (
        <div className="alerte alerte-info">
          <p>
            {donnees.detail ??
              "Résultats disponibles après validation de l'enseignant."}
          </p>
        </div>
      ) : (
        <>
          <p>
            <strong>Note totale :</strong> {formaterNombre(donnees.note_totale)}{' '}
            point(s)
          </p>

          <section className="section">
            <h2>Réponses</h2>
            {reponses.length === 0 ? (
              <p className="texte-efface">
                Aucune réponse enregistrée pour cette tentative.
              </p>
            ) : quiz.isPending ? (
              <SqueletteTexte lignes={4} />
            ) : (
              <div className="liste-elements">
                {reponses.map((reponse) => (
                  <LigneReponse
                    key={reponse.uuid}
                    reponse={reponse}
                    question={questionsParUuid.get(reponse.question_uuid)}
                    peutNoter={peutPublier(role)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {peutPublier(role) && (
        <section className="section">
          <h2>Actions enseignant</h2>
          <div className="actions-ligne">
            {donnees.statut === 'soumis' && (
              <button
                type="button"
                className="bouton bouton-primaire"
                disabled={valider.isPending}
                onClick={() => valider.mutate(uuid)}
              >
                {valider.isPending ? 'Validation…' : 'Valider la tentative'}
              </button>
            )}
            {donnees.statut === 'valide' && (
              <button
                type="button"
                className="bouton bouton-primaire"
                disabled={
                  reporter.isPending || Boolean(donnees.evaluation_note_id)
                }
                onClick={() => reporter.mutate(uuid)}
                title="Report de la note totale vers evaluations.notes"
              >
                {donnees.evaluation_note_id
                  ? 'Note déjà reportée'
                  : reporter.isPending
                    ? 'Report…'
                    : 'Reporter vers evaluations.notes'}
              </button>
            )}
          </div>
          {(valider.isError || reporter.isError) && (
            <p className="erreur-champ" role="alert">
              {messageErreur(
                valider.isError ? valider.error : reporter.error,
              )}
            </p>
          )}
          {donnees.evaluation_note_id && (
            <p className="aide">
              Note reportée : evaluation_note_id{' '}
              {uuidCourt(donnees.evaluation_note_id)}
            </p>
          )}
        </section>
      )}
    </>
  )
}
