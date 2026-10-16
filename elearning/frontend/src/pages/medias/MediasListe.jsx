import { useState } from 'react'

import { messageErreur } from '../../api/client.js'
import { useMediasListe, useUrlSignee } from '../../api/medias.js'
import { BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { FormulaireMedia } from '../../components/FormulaireMedia.jsx'
import { Pagination } from '../../components/Pagination.jsx'
import { SqueletteTableau } from '../../components/Squelette.jsx'
import { formaterDateHeure, uuidCourt } from '../../utils/format.js'

/** Ligne d'un média : lien direct Cloudinary si disponible, sinon demande
 * d'une URL signée S3/MinIO à la demande (le hook reste désactivé tant
 * que le bouton n'est pas actionné). */
function LigneMedia({ media }) {
  const urlSignee = useUrlSignee(media.uuid, { enabled: false })

  return (
    <tr>
      <td>
        <BadgeStatut valeur={media.type} />
      </td>
      <td>{media.nom_fichier || '-'}</td>
      <td title={media.uuid}>{uuidCourt(media.uuid)}</td>
      <td>{formaterDateHeure(media.created_at)}</td>
      <td>
        {media.url_cloudinary ? (
          <a
            href={media.url_cloudinary}
            target="_blank"
            rel="noreferrer noopener"
          >
            Ouvrir
          </a>
        ) : (
          <div className="actions-ligne">
            <button
              type="button"
              className="bouton bouton-secondaire bouton-compact"
              onClick={() => urlSignee.refetch()}
              disabled={urlSignee.isFetching}
            >
              {urlSignee.isFetching ? '…' : 'URL signée'}
            </button>
            {urlSignee.data?.url && (
              <a
                href={urlSignee.data.url}
                target="_blank"
                rel="noreferrer noopener"
                title={`Lien valable ${urlSignee.data.expire_dans} secondes`}
              >
                Lien temporaire
              </a>
            )}
            {urlSignee.isError && (
              <span className="erreur-champ" role="alert">
                {messageErreur(urlSignee.error)}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

export function MediasListe() {
  const [page, setPage] = useState(1)
  const medias = useMediasListe({ page })

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Médiathèque</h1>
          <span className="badge badge-texte">
            {medias.data?.count ?? '…'} média(s)
          </span>
        </div>
      </div>
      <p className="texte-efface">
        Les fichiers sont envoyés directement vers Cloudinary (signature
        fournie par le backend) ou référencés par URL externe. Aucune
        suppression physique : DELETE est refusé côté API.
      </p>

      <div className="carte">
        <h2>Référencer un média</h2>
        <FormulaireMedia
          onCree={() => medias.refetch()}
          dossier="elearning"
        />
      </div>

      <section className="section">
        <h2>Médias du tenant</h2>
        {medias.isPending ? (
          <SqueletteTableau colonnes={5} />
        ) : medias.isError ? (
          <ErreurApi erreur={medias.error} reessayer={() => medias.refetch()} />
        ) : (
          <>
            {(medias.data?.results ?? []).length === 0 ? (
              <p className="texte-efface">
                Aucun média référencé pour l'instant.
              </p>
            ) : (
              <div className="tableau-defilant">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Nom</th>
                      <th>UUID</th>
                      <th>Créé le</th>
                      <th>Accès</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(medias.data?.results ?? []).map((media) => (
                      <LigneMedia key={media.uuid} media={media} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              total={medias.data?.count ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </>
  )
}
