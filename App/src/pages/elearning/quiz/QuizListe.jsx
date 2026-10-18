import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useQuizListe } from '../../../services/elearning/quiz.js'
import { BadgeStatut } from '../../../components/elearning/BadgeStatut.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { Pagination } from '../../../components/elearning/Pagination.jsx'
import { SqueletteGrille } from '../../../components/elearning/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../../context/elearning/profil.js'
import { uuidCourt } from '../../../lib/elearning/format.js'

export function QuizListe() {
  const role = useProfilStore((etat) => etat.role)
  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [brouillon, setBrouillon] = useState({
    matiere_id: '',
    classe_id: '',
    statut: '',
  })
  const [filtres, setFiltres] = useState(brouillon)
  const [page, setPage] = useState(1)

  const params = {
    page,
    matiere_id: filtres.matiere_id || undefined,
    classe_id: filtres.classe_id || undefined,
    statut: filtres.statut || undefined,
  }
  const quiz = useQuizListe(params)

  function appliquerFiltres(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setPage(1)
  }

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Quiz & QCM</h1>
          <span className="badge badge-texte">
            {quiz.data?.count ?? '…'} quiz au total
          </span>
        </div>
        {peutPublier(role) && (
          <Link to="/elearning/quiz/nouveau" className="bouton bouton-primaire">
            <Icone nom="add" />
            Nouveau quiz
          </Link>
        )}
      </div>

      <form className="barre-filtres" onSubmit={appliquerFiltres}>
        <div className="champ">
          <label htmlFor="filtre-matiere-quiz">Matière (UUID)</label>
          <input
            id="filtre-matiere-quiz"
            type="text"
            value={brouillon.matiere_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, matiere_id: e.target.value }))
            }
            placeholder={matiereProfil || 'Toutes les matières'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-classe-quiz">Classe (UUID)</label>
          <input
            id="filtre-classe-quiz"
            type="text"
            value={brouillon.classe_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_id: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-statut-quiz">Statut</label>
          <select
            id="filtre-statut-quiz"
            value={brouillon.statut}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, statut: e.target.value }))
            }
          >
            <option value="">Tous</option>
            <option value="brouillon">Brouillon</option>
            <option value="publie">Publié</option>
            <option value="archive">Archivé</option>
          </select>
        </div>
        <button type="submit" className="bouton bouton-secondaire">
          Filtrer
        </button>
      </form>

      {quiz.isPending ? (
        <SqueletteGrille nombre={6} />
      ) : quiz.isError ? (
        <ErreurApi erreur={quiz.error} reessayer={() => quiz.refetch()} />
      ) : (
        <>
          {(quiz.data?.results ?? []).length === 0 ? (
            <p className="texte-efface">
              Aucun quiz ne correspond à ces critères.
            </p>
          ) : (
            <div className="grille-cartes">
              {(quiz.data?.results ?? []).map((element) => (
                <article
                  key={element.uuid}
                  className={`carte ${
                    element.statut === 'publie'
                      ? 'carte-bandeau-vert'
                      : 'carte-bandeau-gris'
                  }`}
                >
                  <h3>
                    <Link to={`/quiz/${element.uuid}`}>{element.titre}</Link>
                  </h3>
                  <div className="actions-ligne">
                    <BadgeStatut valeur={element.statut} />
                    <BadgeStatut valeur={element.restitution} />
                  </div>
                  <div className="carte-pied">
                    <span>Matière {uuidCourt(element.matiere_id)}</span>
                    <span>Classe {uuidCourt(element.classe_id)}</span>
                    <span>{element.nb_questions} question(s)</span>
                    <span>
                      {element.tentatives_max === null
                        ? 'Tentatives illimitées'
                        : `${element.tentatives_max} tentative(s) max`}
                      {element.chrono_secondes
                        ? ` - chrono ${Math.round(element.chrono_secondes / 60)} min`
                        : ''}
                    </span>
                  </div>
                  {role === 'apprenant' && element.statut === 'publie' && (
                    <Link
                      to={`/quiz/${element.uuid}/passer`}
                      className="bouton bouton-primaire"
                    >
                      Passer le quiz
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            total={quiz.data?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
