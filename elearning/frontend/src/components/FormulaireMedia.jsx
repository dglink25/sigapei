import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { api, messageErreur } from '../api/client.js'
import { creerMediaParUpload } from '../api/medias.js'

/**
 * Création d'un média, deux voies :
 * - « upload » : signature demandée au backend puis envoi direct du fichier
 *   vers Cloudinary (le fichier ne transite jamais par le backend) ;
 * - « url » : référence d'une ressource externe (YouTube, mp4 distant…).
 * Si Cloudinary n'est pas configuré (HTTP 503), le message du backend est
 * affiché et l'utilisateur peut basculer sur le mode « url ».
 */
export function FormulaireMedia({ onCree, dossier = 'elearning' }) {
  const [mode, setMode] = useState('upload')
  const [erreur, setErreur] = useState('')
  const [url, setUrl] = useState('')
  const [nom, setNom] = useState('')
  const [type, setType] = useState('video')

  const envoiFichier = useMutation({
    mutationFn: (fichier) => creerMediaParUpload(fichier, dossier),
    onSuccess: (media) => {
      setErreur('')
      onCree(media)
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  const creationUrl = useMutation({
    mutationFn: async (donnees) => (await api.post('/medias/', donnees)).data,
    onSuccess: (media) => {
      setErreur('')
      onCree(media)
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  function soumettreUrl() {
    if (!url.trim()) {
      setErreur('Renseignez une URL de média.')
      return
    }
    creationUrl.mutate({
      type,
      nom_fichier: nom.trim(),
      url_cloudinary: url.trim(),
    })
  }

  return (
    <div className="formulaire-media carte-interieure">
      <div className="modes">
        <button
          type="button"
          className={`bouton bouton-compact ${mode === 'upload' ? 'bouton-primaire' : 'bouton-secondaire'}`}
          onClick={() => setMode('upload')}
        >
          Fichier (Cloudinary)
        </button>
        <button
          type="button"
          className={`bouton bouton-compact ${mode === 'url' ? 'bouton-primaire' : 'bouton-secondaire'}`}
          onClick={() => setMode('url')}
        >
          URL externe (YouTube, lien direct…)
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="champ">
          <p className="aide">
            Le fichier est envoyé directement vers Cloudinary avec une
            signature fournie par le backend ; seul le résultat (URL,
            identifiant public) est référencé dans /v1/medias/.
          </p>
          <input
            type="file"
            accept="video/*,image/*,.pdf,.doc,.docx,.odt,.txt"
            onChange={(evenement) => {
              const fichier = evenement.target.files?.[0]
              if (fichier) envoiFichier.mutate(fichier)
            }}
            disabled={envoiFichier.isPending}
          />
          {envoiFichier.isPending && (
            <p className="chargement-en-cours">
              <span className="roue" aria-hidden="true" /> Envoi en cours…
            </p>
          )}
        </div>
      ) : (
        // Pas de <form> imbriqué : ce composant s'affiche déjà à
        // l'intérieur des formulaires (leçon, soumission, ressource) et un
        // form dans un form est de l'HTML invalide - le clic soumettait
        // le formulaire parent au lieu d'enregistrer le média.
        <div className="formulaire">
          <div className="champ">
            <label htmlFor="media-type">Type</label>
            <select
              id="media-type"
              value={type}
              onChange={(evenement) => setType(evenement.target.value)}
            >
              <option value="video">Vidéo</option>
              <option value="document">Document</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div className="champ">
            <label htmlFor="media-url">URL</label>
            <input
              id="media-url"
              type="url"
              value={url}
              onChange={(evenement) => setUrl(evenement.target.value)}
              placeholder="https://www.youtube.com/watch?v=… ou https://…/video.mp4"
            />
          </div>
          <div className="champ">
            <label htmlFor="media-nom">Nom (facultatif)</label>
            <input
              id="media-nom"
              type="text"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
              placeholder="Ex. Introduction aux équations"
            />
          </div>
          <button
            type="button"
            className="bouton bouton-primaire"
            onClick={soumettreUrl}
            disabled={creationUrl.isPending}
          >
            {creationUrl.isPending ? (
              <>
                <span className="roue" aria-hidden="true" /> Enregistrement…
              </>
            ) : (
              'Enregistrer le média'
            )}
          </button>
        </div>
      )}

      {erreur && (
        <p className="erreur-champ" role="alert">
          {erreur}
          {erreur.includes('Cloudinary non configuré') && (
            <> - utilisez le mode « URL externe » en attendant.</>
          )}
        </p>
      )}
    </div>
  )
}
