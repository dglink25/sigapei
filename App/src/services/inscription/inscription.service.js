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

  // ── Appels à candidature ───────────────────────────────────────────

  /**
   * Lister les appels à candidature
   */
  listerAppels: async (filtres = {}) => {
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const qs = params.toString()
    const r = await http.get(`/appels-candidatures${qs ? '?' + qs : ''}`)
    return r?.donnees ?? r?.data ?? r ?? []
  },

  /**
   * Afficher un appel par son UUID
   */
  afficherAppel: async (uuid) => {
    const r = await http.get(`/appels-candidatures/${uuid}`)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Lancer / Créer un appel à candidature
   */
  creerAppel: async (donnees) => {
    const r = await http.post('/appels-candidatures', donnees)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Modifier un appel à candidature
   */
  modifierAppel: async (uuid, donnees) => {
    const r = await http.patch(`/appels-candidatures/${uuid}`, donnees)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Marquer un appel à candidature comme terminé
   */
  terminerAppel: async (uuid) => {
    const r = await http.post(`/appels-candidatures/${uuid}/terminer`, {})
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Supprimer un appel à candidature
   */
  supprimerAppel: async (uuid) => {
    const r = await http.delete(`/appels-candidatures/${uuid}`)
    return r?.donnees ?? r?.data ?? r
  },
}
