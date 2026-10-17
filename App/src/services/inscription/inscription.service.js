/**
 * Service API Inscription pour App
 * Connecté au microservice Inscription (port 4003)
 */

import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'

const INSCRIPTION_BASE = ENV.services.inscription || 'http://localhost:4003'
const http = createHttp(INSCRIPTION_BASE)

export const inscriptionService = {
  /**
   * Lister les candidatures
   */
  listerCandidatures: async (filtres = {}) => {
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const qs = params.toString()
    const r = await http.get(`/candidatures${qs ? '?' + qs : ''}`)
    return r?.donnees ?? r?.data ?? r ?? []
  },

  /**
   * Soumettre une nouvelle candidature
   */
  soumettreCandidature: async (donnees) => {
    const r = await http.post('/candidatures', donnees)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Valider une candidature
   */
  validerCandidature: async (uuid) => {
    const r = await http.post(`/candidatures/${uuid}/valider`, {})
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Rejeter une candidature
   */
  rejeterCandidature: async (uuid, motif) => {
    const r = await http.post(`/candidatures/${uuid}/rejeter`, { motif })
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Réinscrire un apprenant
   */
  reinscrireApprenant: async (donnees) => {
    const r = await http.post('/reinscriptions', donnees)
    return r?.donnees ?? r?.data ?? r
  },
}
