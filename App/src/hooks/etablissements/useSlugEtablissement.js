import { useParams } from 'react-router-dom'
import { detecterSlugEtablissement } from '../../lib/etablissements/subdomain'

/** Slug de l'établissement : paramètre de route en local, sous-domaine en production. */
export default function useSlugEtablissement() {
  const { slug } = useParams()
  return slug ?? detecterSlugEtablissement()
}
