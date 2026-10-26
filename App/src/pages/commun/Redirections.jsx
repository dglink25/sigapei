import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { detecterSlugEtablissement, urlConnexion, urlEtablissementAbsolue } from '../../lib/etablissements/subdomain'
import Loader from '../../components/commun/Loader'

/** Plateforme : /etablissements/:slug -> sous-domaine de l'établissement (production). */
export function VersEtablissement() {
  const { slug } = useParams()
  useEffect(() => { window.location.replace(urlEtablissementAbsolue(slug)) }, [slug])
  return <Loader label="Redirection vers l'établissement…" />
}

/** Sous-domaine d'un établissement : la connexion est centralisée sur la plateforme. */
export function VersConnexion() {
  useEffect(() => { window.location.replace(urlConnexion(detecterSlugEtablissement())) }, [])
  return <Loader label="Redirection vers la connexion…" />
}
