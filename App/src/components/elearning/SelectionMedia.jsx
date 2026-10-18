import { useState } from 'react'

import { useMedia, useMediasListe } from '../../services/elearning/medias.js'
import { BadgeStatut } from './BadgeStatut.jsx'
import { FormulaireMedia } from './FormulaireMedia.jsx'
import { LecteurVideo } from './LecteurVideo.jsx'
import { SqueletteLigne } from './Squelette.jsx'
import { uuidCourt } from '../../lib/elearning/format.js'

/**
 * Sélection d'un média pour un formulaire (leçon, soumission, ressource) :
 * - choisir un média déjà référencé dans /v1/medias/ ;
 * - ou en créer un à la volée (upload Cloudinary / URL externe).
 * Renvoie l'UUID du média choisi via onChange.
 */
export function SelectionMedia({
  valeur,
  onChange,
  libelle = 'Média',
  obligatoire = false,
}) {
  const [afficherCreation, setAfficherCreation] = useState(false)
  const medias = useMediasListe({ page: 1 })
  const mediaChoisi = useMedia(valeur || null, {
    enabled: Boolean(valeur),
  })

  function mediaCree(media) {
    onChange(media.uuid)
    setAfficherCreation(false)
  }

  return (
    <div className="champ selection-media">
      <label>{libelle}{obligatoire ? ' *' : ''}</label>

      {medias.isPending ? (
        <SqueletteLigne />
      ) : (
        <div className="selection-media-ligne">
          <select
            value={valeur ?? ''}
            onChange={(evenement) => onChange(evenement.target.value || null)}
            aria-label="Média"
          >
            <option value="">- Aucun -</option>
            {(medias.data?.results ?? []).map((media) => (
              <option key={media.uuid} value={media.uuid}>
                {media.type} - {media.nom_fichier || uuidCourt(media.uuid)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="bouton bouton-secondaire bouton-compact"
            onClick={() => setAfficherCreation((etat) => !etat)}
          >
            {afficherCreation ? 'Annuler' : 'Nouveau média…'}
          </button>
        </div>
      )}

      {afficherCreation && <FormulaireMedia onCree={mediaCree} />}

      {mediaChoisi.data && (
        <div className="media-apercu carte-interieure">
          <BadgeStatut valeur={mediaChoisi.data.type} />
          {mediaChoisi.data.type === 'video' && (
            <LecteurVideo
              url={mediaChoisi.data.url_cloudinary}
              titre={mediaChoisi.data.nom_fichier || 'Vidéo'}
            />
          )}
          {mediaChoisi.data.type === 'image' && (
            <img
              src={mediaChoisi.data.url_cloudinary}
              alt={mediaChoisi.data.nom_fichier || 'Image du média'}
              loading="lazy"
            />
          )}
          {mediaChoisi.data.type === 'document' && mediaChoisi.data.url_cloudinary && (
            <a
              href={mediaChoisi.data.url_cloudinary}
              target="_blank"
              rel="noreferrer noopener"
            >
              Ouvrir le document
            </a>
          )}
          {!mediaChoisi.data.url_cloudinary && (
            <p className="aide">
              Document stocké sur S3/MinIO : utilisez l'action « URL signée »
              de la page Médias pour obtenir un lien temporaire.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
