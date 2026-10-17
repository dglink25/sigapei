import { authApi as api } from '../../lib/commun/http'

/** Portail de l'utilisateur : établissement (slug), indicateur administrateur, services et état d'accès. */
export const portailService = {
  lire: () => api.get('/moi/portail'),
}
