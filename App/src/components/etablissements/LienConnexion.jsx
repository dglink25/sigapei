import { Link } from 'react-router-dom'
import { LOGIN_PATH } from '../../config/identite/routes'
import { MODE_SOUS_DOMAINE, lienEtablissement, urlConnexion } from '../../lib/etablissements/subdomain'

/** Bouton « Se connecter » d'un établissement : connexion centrale (production) ou page /login (local). */
export default function LienConnexion({ slug, className, children }) {
  if (MODE_SOUS_DOMAINE) {
    return <a href={urlConnexion(slug)} className={className}>{children}</a>
  }
  // Mode dev : passer le slug en query param pour que AuthPage affiche le contexte étab
  return (
    <Link
      to={`${LOGIN_PATH}${slug ? `?etablissement=${encodeURIComponent(slug)}` : ''}`}
      state={{ from: { pathname: lienEtablissement(slug, '/portail') }, etablissement: slug }}
      className={className}
    >
      {children}
    </Link>
  )
}
