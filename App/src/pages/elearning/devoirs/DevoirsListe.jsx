import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useDevoirsListe } from '../../../services/elearning/devoirs.js'
import { BadgeRetard, BadgeStatut } from '../../../components/elearning/BadgeStatut.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { PillsStatut } from '../../../components/elearning/PillsStatut.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Pagination } from '../../../components/elearning/Pagination.jsx'
import { SqueletteGrille } from '../../../components/elearning/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../../context/elearning/profil.js'
import { estDatePassee, formaterDateHeure, uuidCourt } from '../../../lib/elearning/format.js'

/** Statut dérivé d'un devoir pour les pills de filtrage. */
function statutDevoir(devoir) {
  if (!estDatePassee(devoir.date_limite)) return 'en_cours'
  return devoir.nb_soumissions > 0 ? 'a_corriger' : 'cloture'
}

/** Jours restants avant la date limite (négatif si dépassée). */
function joursRestants(dateLimite) {
  return Math.ceil((new Date(dateLimite) - Date.now()) / 86_400_000)
}

/** Bandeau de carte : or si échéance imminente, vert si clôturé, gris sinon. */
function bandeauDevoir(devoir) {
  const jours = joursRestants(devoir.date_limite)
  if (estDatePassee(devoir.date_limite)) return 'carte-bandeau-vert'
  return jours <= 3 ? 'carte-bandeau-or' : 'carte-bandeau-gris'
}

export function DevoirsListe() {
  const role = useProfilStore((etat) => etat.role)
  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [brouillon, setBrouillon] = useState({
    matiere_id: '',
    classe_id: '',
  })
  const [filtres, setFiltres] = useState(brouillon)
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('tous')

  const params = {
    page,
    matiere_id: filtres.matiere_id || undefined,
    classe_id: filtres.classe_id || undefined,
  }
  const devoirs = useDevoirsListe(params)

  const liste = devoirs.data?.results ?? []
  const compteurs = liste.reduce(
    (total, devoir) => {
      total[statutDevoir(devoir)] += 1
      return total
    },
    { a_corriger: 0, en_cours: 0, cloture: 0 },
  )

  const optionsPills = [
    { valeur: 'tous', libelle: 'Tous', compteur: liste.length },
    {
      valeur: 'a_corriger',
      libelle: 'À corriger',
      compteur: compteurs.a_corriger,
      compteurVariante: 'or',
    },
    { valeur: 'en_cours', libelle: 'En cours', compteur: compteurs.en_cours },
    { valeur: 'cloture', libelle: 'Clôturés', compteur: compteurs.cloture },
  ]

  function appliquerFiltres(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setPage(1)
  }

  const visible = liste.filter(
    (devoir) => statut === 'tous' || statutDevoir(devoir) === statut,
  )

  return (
    <>
      <div className="titre-page">
        <h1>Devoirs & Évaluations</h1>
        {peutPublier(role) && (
          <Link to="/elearning/devoirs/nouveau" className="bouton bouton-primaire">
            <Icone nom="add" />
            Nouveau devoir
          </Link>
        )}
      </div>

      <p className="alerte alerte-info" role="note">
        <strong>Politique de retard :</strong> « Blocage » refuse tout dépôt
        après la date limite ; « Pénalité » accepte le dépôt tardif et le
        marque « En retard ». Les pastilles ci-dessous filtrent la page
        affichée.
      </p>

      <form className="barre-filtres" onSubmit={appliquerFiltres}>
        <div className="champ">
          <label htmlFor="filtre-matiere-devoir">Matière</label>
          <input
            id="filtre-matiere-devoir"
            type="text"
            value={brouillon.matiere_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, matiere_id: e.target.value }))
            }
            placeholder={matiereProfil || 'Toutes les matières'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-classe-devoir">Classe</label>
          <input
            id="filtre-classe-devoir"
            type="text"
            value={brouillon.classe_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_id: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <button type="submit" className="bouton bouton-secondaire">
          Filtrer
        </button>
      </form>

      {devoirs.isPending ? (
        <SqueletteGrille nombre={6} />
      ) : devoirs.isError ? (
        <ErreurApi erreur={devoirs.error} reessayer={() => devoirs.refetch()} />
      ) : (
        <>
          <div className="section">
            <PillsStatut
              options={optionsPills}
              valeur={statut}
              onChange={setStatut}
            />
          </div>

          {visible.length === 0 ? (
            <p className="texte-efface">
              Aucun devoir ne correspond à ces critères.
            </p>
          ) : (
            <div className="grille-cartes">
              {visible.map((element) => {
                const jours = joursRestants(element.date_limite)
                const urgent =
                  !estDatePassee(element.date_limite) && jours <= 3

                return (
                  <article
                    key={element.uuid}
                    className={`carte ${bandeauDevoir(element)}`}
                  >
                    <h3>
                      <Link to={`/devoirs/${element.uuid}`}>
                        {element.titre}
                      </Link>
                    </h3>
                    <div className="actions-ligne">
                      <BadgeStatut valeur={element.politique_retard} />
                      {estDatePassee(element.date_limite) && <BadgeRetard />}
                    </div>
                    {element.enonce && (
                      <p className="texte-efface">
                        {element.enonce.slice(0, 140)}
                        {element.enonce.length > 140 ? '…' : ''}
                      </p>
                    )}
                    <div className="carte-pied">
                      <span>Matière {uuidCourt(element.matiere_id)}</span>
                      <span>Classe {uuidCourt(element.classe_id)}</span>
                      <span>{element.nb_soumissions} soumission(s)</span>
                      <span>
                        À rendre avant le {formaterDateHeure(element.date_limite)}
                      </span>
                      {urgent && (
                        <span
                          className={`minuteur ${jours <= 1 ? 'rebond' : ''}`}
                        >
                          <Icone nom="timer" classe="icone icone-sm" />
                          J-{Math.max(jours, 0)}
                        </span>
                      )}
                    </div>
                    <div className="actions-ligne" style={{ marginTop: '0.8rem' }}>
                      <Link
                        to={`/devoirs/${element.uuid}`}
                        className="bouton bouton-vert bouton-compact"
                      >
                        {peutPublier(role)
                          ? 'Consulter & Noter'
                          : 'Consulter & Déposer'}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <Pagination
            page={page}
            total={devoirs.data?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
