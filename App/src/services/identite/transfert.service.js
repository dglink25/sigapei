import { authApi as api } from '../../lib/commun/http'

/**
 * Transfert de session vers le sous-domaine d'un établissement (phase B, back-end à brancher).
 *  - creer(slug)    : POST /auth/transfert           (authentifié) -> { code }
 *  - echanger(code) : POST /auth/transfert/echanger  (public)      -> session { accessToken, refreshToken, utilisateur }
 */
export const transfertService = {
  creer: (slug) => api.post('/auth/transfert', { slug }),
  echanger: (code) => api.post('/auth/transfert/echanger', { code }, { auth: false }),
}
