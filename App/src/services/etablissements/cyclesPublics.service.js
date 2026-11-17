/**
 * Cycles actifs d'un établissement - lecture publique (sans auth).
 * Retourne les cycles autorisés ET actifs pour l'année académique en cours.
 * Utilise l'endpoint public du microservice établissements.
 */
import { createHttp } from '../../lib/commun/http'
import { API_BASE } from '../../config/etablissements/config'

const api    = createHttp(API_BASE)
const PUBLIC = { auth: false }

export const cyclesPublicsService = {
  /**
   * Cycles autorisés de l'établissement (endpoint public existant).
   * @param {string} slug
   * @returns {Promise<string[]>} ex: ['secondaire', 'primaire']
   */
  listerAutorises: async (slug) => {
    const r = await api.get(`/etablissements/${slug}/cycles-autorises`, PUBLIC)
    // Ne retourner que les cycles avec statut 'actif'
    const cycles = Array.isArray(r?.cyclesAutorises) ? r.cyclesAutorises : []
    return cycles
      .filter((c) => c.statut === 'actif')
      .map((c) => c.cycle)
  },
}
