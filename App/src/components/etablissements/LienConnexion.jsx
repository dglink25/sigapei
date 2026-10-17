import { Link } from 'react-router-dom'
import { LOGIN_PATH } from '../../config/identite/routes'
import { MODE_SOUS_DOMAINE, lienEtablissement, urlConnexion } from '../../lib/etablissements/subdomain'

/** Bouton « Se connecter » d'un établissement : connexion centrale (production) ou page /login (local). */
export default function LienConnexion({ slug, className, children }) {
  if (MODE_SOUS_DOMAINE) {
    return <a href={urlConnexion(slug)} className={className}>{children}</a>
  }
  return (
    <Link to={LOGIN_PATH} state={{ from: { pathname: lienEtablissement(slug, '/portail') } }} className={className}>
      {children}
    </Link>
  )
}
