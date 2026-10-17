import { MODE_SOUS_DOMAINE, lienEtablissement, urlEtablissementAbsolue } from '../etablissements/subdomain'
import { transfertService } from '../../services/identite/transfert.service'

/**
 * Ouvre une page de l'établissement. En local : simple navigation. En production (sous-domaine) :
 * transfert de la session par code à usage unique (60 s), échangé par la page /auth/callback de l'établissement.
 */
export async function allerVersEtablissement(slug, chemin, navigate) {
  if (!MODE_SOUS_DOMAINE) {
    navigate(lienEtablissement(slug, chemin), { replace: true })
    return
  }
  const r = await transfertService.creer(slug)
  if (!r?.code) throw new Error('Transfert de session impossible.')
  const url = new URL(urlEtablissementAbsolue(slug, '/auth/callback'))
  url.searchParams.set('code', r.code)
  url.searchParams.set('to', chemin)
  window.location.assign(url.toString())
}
