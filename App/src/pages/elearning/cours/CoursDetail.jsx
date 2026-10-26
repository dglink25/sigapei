import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  useAjouterLecon,
  useArchiverCours,
  useCours,
  useReordonnerLecons,
} from '../../../services/elearning/cours.js'
import { messageErreur } from '../../../services/elearning/client.js'
import { BadgeStatut } from '../../../components/elearning/BadgeStatut.jsx'
import { EditeurMarkdown } from '../../../components/elearning/EditeurMarkdown.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { Icone } from '../../../components/elearning/Icone.jsx'
import { LecteurVideo } from '../../../components/elearning/LecteurVideo.jsx'
import { Markdown } from '../../../components/elearning/Markdown.jsx'
import { SelectionMedia } from '../../../components/elearning/SelectionMedia.jsx'
import { SqueletteTexte } from '../../../components/elearning/Squelette.jsx'
import { peutPublier, useProfilStore } from '../../../context/elearning/profil.js'
import { formaterDateHeure, uuidCourt } from '../../../lib/elearning/format.js'

const TYPES_LECON = [
  { valeur: 'texte', libelle: 'Texte (Markdown)' },
  { valeur: 'video', libelle: 'Vidéo' },
  { valeur: 'document', libelle: 'Document / pièce jointe' },
]

function LeconAffichee({ lecon, numero, monter, descendre }) {
  return (
    <article className="element">
      <div className="element-tete">
        <h3>
          {numero}. {lecon.titre}
        </h3>
        <BadgeStatut valeur={lecon.type_contenu} />
        <div className="actions-ligne">
          <button
            type="button"
            className="bouton bouton-secondaire bouton-compact"
            onClick={monter}
            title="Monter la leçon"
          >
            ↑
          </button>
          <button
            type="button"
            className="bouton bouton-secondaire bouton-compact"
            onClick={descendre}
            title="Descendre la leçon"
          >
            ↓
          </button>
        </div>
      </div>

      {lecon.type_contenu === 'texte' && <Markdown contenu={lecon.contenu_texte} />}

      {lecon.type_contenu !== 'texte' && lecon.media_detail && (
        <>
          {lecon.media_detail.type === 'video' && (
            <LecteurVideo
              url={lecon.media_detail.url_cloudinary}
              titre={lecon.media_detail.nom_fichier || lecon.titre}
            />
          )}
          {lecon.media_detail.type === 'image' && (
            <img
              src={lecon.media_detail.url_cloudinary}
              alt={lecon.media_detail.nom_fichier || lecon.titre}
              loading="lazy"
            />
          )}
          {lecon.media_detail.type === 'document' && (
            <p>
              {lecon.media_detail.nom_fichier || 'Document'} -{' '}
              {lecon.media_detail.url_cloudinary ? (
                <a
                  href={lecon.media_detail.url_cloudinary}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ouvrir
                </a>
              ) : (
                'Lien temporaire indisponible pour l&#39;instant.'
              )}
            </p>
          )}
        </>
      )}
    </article>
  )
}

function FormulaireLecon({ uuidCours }) {
  const [titre, setTitre] = useState('')
  const [typeContenu, setTypeContenu] = useState('texte')
  const [contenuTexte, setContenuTexte] = useState('')
  const [media, setMedia] = useState(null)
  const ajouterLecon = useAjouterLecon()

  function soumettre(evenement) {
    evenement.preventDefault()
    const donnees = { titre, type_contenu: typeContenu }
    if (typeContenu === 'texte') donnees.contenu_texte = contenuTexte
    if (typeContenu !== 'texte' && media) donnees.media = media

    ajouterLecon.mutate(
      { uuidCours, donnees },
      {
        onSuccess: () => {
          setTitre('')
          setContenuTexte('')
          setMedia(null)
        },
      },
    )
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre}>
      <h2>Ajouter une leçon</h2>
      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor="lecon-titre">Titre *</label>
          <input
            id="lecon-titre"
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="lecon-type">Type de contenu</label>
          <select
            id="lecon-type"
            value={typeContenu}
            onChange={(e) => setTypeContenu(e.target.value)}
          >
            {TYPES_LECON.map((type) => (
              <option key={type.valeur} value={type.valeur}>
                {type.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {typeContenu === 'texte' && (
        <EditeurMarkdown
          libelle="Contenu"
          valeur={contenuTexte}
          onChange={setContenuTexte}
        />
      )}
      {typeContenu !== 'texte' && (
        <SelectionMedia
          libelle={typeContenu === 'video' ? 'Vidéo' : 'Document'}
          valeur={media}
          onChange={setMedia}
        />
      )}

      <button
        type="submit"
        className="bouton bouton-primaire"
        disabled={ajouterLecon.isPending}
      >
        {ajouterLecon.isPending ? (
          <>
            <span className="roue" aria-hidden="true" /> Ajout en cours…
          </>
        ) : (
          'Ajouter la leçon'
        )}
      </button>
      {ajouterLecon.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(ajouterLecon.error)}
        </p>
      )}
    </form>
  )
}

export function CoursDetail() {
  const { uuid } = useParams()
  const role = useProfilStore((etat) => etat.role)
  const cours = useCours(uuid)
  const archiver = useArchiverCours()
  const reordonner = useReordonnerLecons()

  function deplacer(index, direction) {
    const lecons = [...(cours.data?.lecons ?? [])]
    const cible = index + direction
    if (cible < 0 || cible >= lecons.length) return
    ;[lecons[index], lecons[cible]] = [lecons[cible], lecons[index]]
    reordonner.mutate({
      uuidCours: uuid,
      reordonner: lecons.map((lecon, position) => ({
        uuid: lecon.uuid,
        ordre: position + 1,
      })),
    })
  }

  if (cours.isPending) {
    return (
      <>
        <h1>Chargement du cours…</h1>
        <SqueletteTexte lignes={8} />
      </>
    )
  }
  if (cours.isError) {
    return <ErreurApi erreur={cours.error} reessayer={() => cours.refetch()} />
  }

  const donnees = cours.data
  const lecons = donnees.lecons ?? []

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/elearning/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <Link to="/elearning/cours">Cours & Syllabus</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">{donnees.titre}</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>{donnees.titre}</h1>
          <div className="actions-ligne">
            <span className="badge badge-texte">Cours</span>
            <BadgeStatut valeur={donnees.statut} />
            <span className="badge badge-texte">
              Matière {uuidCourt(donnees.matiere_id)}
            </span>
            <span className="badge badge-texte">
              {lecons.length} leçon(s) - {donnees.classes_liees?.length ?? 0}{' '}
              classe(s)
            </span>
          </div>
        </div>
        {peutPublier(role) && (
          <div className="actions-ligne">
            <Link
              to={`/cours/${uuid}/modifier`}
              className="bouton bouton-secondaire"
            >
              <Icone nom="edit" />
              Modifier
            </Link>
            {donnees.statut !== 'archive' && (
              <button
                type="button"
                className="bouton bouton-danger"
                disabled={archiver.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      'Archiver ce cours ? Il ne sera pas supprimé ' +
                        '(suppression physique interdite).',
                    )
                  ) {
                    archiver.mutate(uuid)
                  }
                }}
              >
                {archiver.isPending ? 'Archivage…' : 'Archiver'}
              </button>
            )}
          </div>
        )}
      </div>

      {donnees.description && <Markdown contenu={donnees.description} />}

      <section className="section">
        <h2>Leçons</h2>
        {lecons.length === 0 ? (
          <p className="texte-efface">
            Ce cours n'a pas encore de leçon.
          </p>
        ) : (
          <div className="liste-elements">
            {lecons.map((lecon, index) => (
              <LeconAffichee
                key={lecon.uuid}
                lecon={lecon}
                numero={index + 1}
                monter={() => deplacer(index, -1)}
                descendre={() => deplacer(index, 1)}
              />
            ))}
          </div>
        )}
        <p className="texte-efface">
          Dernière mise à jour : {formaterDateHeure(donnees.updated_at)}
        </p>
      </section>

      {peutPublier(role) && <FormulaireLecon uuidCours={uuid} />}
    </>
  )
}
