/**
 * Appels à candidature - lecture publique (sans authentification).
 * Utilisé par la page publique de l'établissement pour afficher
 * les campagnes ouvertes aux candidats.
 */
import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'

const INSCRIPTION_BASE = ENV.services.inscription || 'http://localhost:4003'
const http = createHttp(INSCRIPTION_BASE)
const PUBLIC = { auth: false }

export const appelsPublicsService = {
  /**
   * Lister les appels ouverts d'un établissement par cycle.
   * @param {string} etablissementUuid  UUID de l'établissement
   * @param {string} cycle              maternelle | primaire | secondaire | universitaire
   */
  listerParCycle: async (etablissementUuid, cycle) => {
    const qs = new URLSearchParams({ etablissement_uuid: etablissementUuid, cycle }).toString()
    const r = await http.get(`/public/appels-candidatures?${qs}`, PUBLIC)
    return Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []
  },

  /**
   * Lister tous les appels d'un établissement (tous cycles).
   */
  listerTous: async (etablissementUuid) => {
    const qs = new URLSearchParams({ etablissement_uuid: etablissementUuid }).toString()
    const r = await http.get(`/public/appels-candidatures?${qs}`, PUBLIC)
    return Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []
  },

  /**
   * Détail d'un appel par UUID (public).
   */
  afficher: async (uuid) => {
    const r = await http.get(`/public/appels-candidatures/${uuid}`, PUBLIC)
    return r?.data ?? r
  },
}
