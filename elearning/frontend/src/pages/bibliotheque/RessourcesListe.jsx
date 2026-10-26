import { useEffect, useState } from 'react'

import { useCreationRessource, useRessourcesListe } from '../../api/bibliotheque.js'
import { messageErreur } from '../../api/client.js'
import { BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { LecteurVideo } from '../../components/LecteurVideo.jsx'
import { Pagination } from '../../components/Pagination.jsx'
import { SelectionMedia } from '../../components/SelectionMedia.jsx'
import { SqueletteGrille } from '../../components/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../stores/profil.js'
import { formaterDate, uuidCourt } from '../../utils/format.js'

/** Aperçu du média d'une ressource : lecteur vidéo (HLS/YouTube), image
 * ou lien de document ; les médias S3/MinIO nécessitent une URL signée. */
function ApercuMedia({ media }) {
  if (!media) return null
  return (
    <>
      <div className="actions-ligne">
        <BadgeStatut valeur={media.type} />
        <span className="texte-efface">
          {media.nom_fichier || uuidCourt(media.uuid)}
        </span>
      </div>
      {media.url_cloudinary && media.type === 'video' && (
        <LecteurVideo
          url={media.url_cloudinary}
          titre={media.nom_fichier || 'Vidéo'}
        />
      )}
      {media.url_cloudinary && media.type === 'image' && (
        <img
          src={media.url_cloudinary}
          alt={media.nom_fichier || 'Image de la ressource'}
          loading="lazy"
        />
      )}
      {media.url_cloudinary && media.type === 'document' && (
        <p>
          <a
            href={media.url_cloudinary}
            target="_blank"
            rel="noreferrer noopener"
          >
            Ouvrir le document
          </a>
        </p>
      )}
      {!media.url_cloudinary && (
        <p className="aide">
          Média stocké sur S3/MinIO : utilisez l'action « URL signée » de la
          page Médias pour obtenir un lien temporaire.
        </p>
      )}
    </>
  )
}

/** Dépôt d'une ressource : le média est obligatoire (déjà référencé dans
 * /v1/medias/ ou créé à la volée), les mots-clés guident la recherche. */
function FormulaireDepotRessource() {
  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)
  const enseignantProfil = useProfilStore((etat) => etat.enseignantId)

  const [titre, setTitre] = useState('')
  const [matiereId, setMatiereId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [enseignantId, setEnseignantId] = useState('')
  const [motsCles, setMotsCles] = useState('')
  const [media, setMedia] = useState(null)
  const [erreur, setErreur] = useState('')
  const creation = useCreationRessource()

  useEffect(() => {
    setMatiereId(matiereProfil)
    setClasseId(classeProfil)
    setEnseignantId(enseignantProfil)
  }, [matiereProfil, classeProfil, enseignantProfil])

  function soumettre(evenement) {
    evenement.preventDefault()
    if (!media) {
      setErreur('Sélectionnez ou créez le média de la ressource.')
      return
    }
    setErreur('')
    creation.mutate(
      {
        titre,
        matiere_id: matiereId,
        classe_id: classeId,
        enseignant_id: enseignantId,
        media,
        mots_cles: motsCles
          .split(',')
          .map((mot) => mot.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          setTitre('')
          setMotsCles('')
          setMedia(null)
        },
      },
    )
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre}>
      <h2>Déposer une ressource</h2>

      <div className="champ">
        <label htmlFor="ressource-titre">Titre *</label>
        <input
          id="ressource-titre"
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          required
        />
      </div>

      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor="ressource-matiere">Matière - UUID (evaluations.matieres) *</label>
          <input
            id="ressource-matiere"
            type="text"
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="ressource-classe">Classe - UUID (scolarite.classes) *</label>
          <input
            id="ressource-classe"
            type="text"
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor="ressource-enseignant">Enseignant - UUID (rh.personnel)</label>
          <input
            id="ressource-enseignant"
            type="text"
            value={enseignantId}
            onChange={(e) => setEnseignantId(e.target.value)}
          />
        </div>
        <div className="champ">
          <label htmlFor="ressource-mots-cles">Mots-clés (séparés par des virgules)</label>
          <input
            id="ressource-mots-cles"
            type="text"
            value={motsCles}
            onChange={(e) => setMotsCles(e.target.value)}
            placeholder="Ex. algebre, equations, seconde"
          />
        </div>
      </div>

      <SelectionMedia
        libelle="Média de la ressource"
        valeur={media}
        onChange={setMedia}
        obligatoire
      />

      <button
        type="submit"
        className="bouton bouton-primaire"
        disabled={creation.isPending}
      >
        {creation.isPending ? (
          <>
            <span className="roue" aria-hidden="true" /> Dépôt en cours…
          </>
        ) : (
          'Déposer la ressource'
        )}
      </button>

      {erreur && (
        <p className="erreur-champ" role="alert">
          {erreur}
        </p>
      )}
      {creation.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(creation.error)}
        </p>
      )}
    </form>
  )
}

export function RessourcesListe() {
  const role = useProfilStore((etat) => etat.role)
  const matiereProfil = useProfilStore((etat) => etat.matiereId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [brouillon, setBrouillon] = useState({
    matiere_id: '',
    classe_id: '',
    mot_cle: '',
  })
  const [filtres, setFiltres] = useState(brouillon)
  const [page, setPage] = useState(1)

  const params = {
    page,
    matiere_id: filtres.matiere_id || undefined,
    classe_id: filtres.classe_id || undefined,
    mot_cle: filtres.mot_cle || undefined,
  }
  const ressources = useRessourcesListe(params)

  function appliquerFiltres(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setPage(1)
  }

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Bibliothèque</h1>
          <span className="badge badge-texte">
            {ressources.data?.count ?? '…'} ressource(s)
          </span>
        </div>
      </div>
      <p className="texte-efface">
        Ressources pédagogiques partagées de l'établissement, classées par
        matière et classe, avec mots-clés de recherche.
      </p>

      <form className="barre-filtres" onSubmit={appliquerFiltres}>
        <div className="champ">
          <label htmlFor="filtre-matiere-ressource">Matière (UUID)</label>
          <input
            id="filtre-matiere-ressource"
            type="text"
            value={brouillon.matiere_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, matiere_id: e.target.value }))
            }
            placeholder={matiereProfil || 'Toutes les matières'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-classe-ressource">Classe (UUID)</label>
          <input
            id="filtre-classe-ressource"
            type="text"
            value={brouillon.classe_id}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_id: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <div className="champ">
          <label htmlFor="filtre-mot-cle">Mot-clé</label>
          <input
            id="filtre-mot-cle"
            type="text"
            value={brouillon.mot_cle}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, mot_cle: e.target.value }))
            }
            placeholder="Ex. equations"
          />
        </div>
        <button type="submit" className="bouton bouton-secondaire">
          Filtrer
        </button>
      </form>

      {ressources.isPending ? (
        <SqueletteGrille nombre={4} />
      ) : ressources.isError ? (
        <ErreurApi
          erreur={ressources.error}
          reessayer={() => ressources.refetch()}
        />
      ) : (
        <>
          {(ressources.data?.results ?? []).length === 0 ? (
            <p className="texte-efface">
              Aucune ressource ne correspond à ces critères.
            </p>
          ) : (
            <div className="grille-cartes">
              {(ressources.data?.results ?? []).map((ressource) => (
                <article key={ressource.uuid} className="carte">
                  <h3>{ressource.titre}</h3>
                  <ApercuMedia media={ressource.media_detail} />
                  {(ressource.mots_cles ?? []).length > 0 && (
                    <div className="carte-pied">
                      {(ressource.mots_cles ?? []).map((mot) => (
                        <span key={mot} className="mot-cle">
                          {mot}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="carte-pied">
                    <span>Matière {uuidCourt(ressource.matiere_id)}</span>
                    <span>Classe {uuidCourt(ressource.classe_id)}</span>
                    {ressource.enseignant_id && (
                      <span>
                        Enseignant {uuidCourt(ressource.enseignant_id)}
                      </span>
                    )}
                    <span>Déposée le {formaterDate(ressource.date_depot)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            total={ressources.data?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      {peutPublier(role) && <FormulaireDepotRessource />}
    </>
  )
}
