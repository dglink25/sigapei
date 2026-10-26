import { useState } from 'react'
import { Link } from 'react-router'

import { useCoursListe } from '../../api/cours.js'
import { BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { Pagination } from '../../components/Pagination.jsx'
import { SqueletteGrille } from '../../components/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../stores/profil.js'
import { formaterDate, uuidCourt } from '../../utils/format.js'

export function CoursListe() {
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
  const cours = useCoursListe(params)

  function appliquerFiltres(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setPage(1)
  }

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Cours & Syllabus</h1>
          <span className="badge badge-texte">
            {cours.data?.count ?? '…'} cours au total
          </span>
        </div>
        {peutPublier(role) && (
          <Link to="/cours/nouveau" className="bouton bouton-primaire">
            <Icone nom="add" />
            Nouveau cours
          </Link>
        )}
      </div>

      <form className="barre-filtres" onSubmit={appliquerFiltres}>
        <div className="champ">
          <label htmlFor="filtre-matiere">Matière (UUID)</label>
          <input
            id="filtre-matiere"
            type="text"
            value={brouillon.matiere_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, matiere_id: e.target.value }))
            }
            placeholder={matiereProfil || 'Toutes les matières'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-classe">Classe (UUID)</label>
          <input
            id="filtre-classe"
            type="text"
            value={brouillon.classe_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_id: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-statut">Statut</label>
          <select
            id="filtre-statut"
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

      {cours.isPending ? (
        <SqueletteGrille nombre={6} />
      ) : cours.isError ? (
        <ErreurApi erreur={cours.error} reessayer={() => cours.refetch()} />
      ) : (
        <>
          {(cours.data?.results ?? []).length === 0 ? (
            <p className="texte-efface">
              Aucun cours ne correspond à ces critères.
            </p>
          ) : (
            <div className="grille-cartes">
              {(cours.data?.results ?? []).map((element) => (
                <article
                  key={element.uuid}
                  className={`carte ${
                    element.statut === 'publie'
                      ? 'carte-bandeau-vert'
                      : 'carte-bandeau-gris'
                  }`}
                >
                  <h3>
                    <Link to={`/cours/${element.uuid}`}>{element.titre}</Link>
                  </h3>
                  <BadgeStatut valeur={element.statut} />
                  {element.description && (
                    <p className="texte-efface">
                      {element.description.slice(0, 140)}
                      {element.description.length > 140 ? '…' : ''}
                    </p>
                  )}
                  <div className="carte-pied">
                    <span>Matière {uuidCourt(element.matiere_id)}</span>
                    <span>{element.classes_liees?.length ?? 0} classe(s)</span>
                    <span>{element.lecons?.length ?? 0} leçon(s)</span>
                    <span>
                      Publié le {formaterDate(element.date_publication)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            total={cours.data?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
