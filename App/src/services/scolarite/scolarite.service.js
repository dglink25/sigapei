/**
 * Service API Scolarité pour App
 * Connecté au microservice Scolarité (port 4004)
 */

import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'

const SCOLARITE_BASE = ENV.services.scolarite || 'http://localhost:4004'
const http = createHttp(SCOLARITE_BASE)

export const scolariteService = {
  /**
   * Lister les classes
   */
  listerClasses: async () => {
    const r = await http.get('/classes')
    return r?.donnees ?? r?.data ?? r ?? []
  },

  /**
   * Créer une classe
   */
  creerClasse: async (donnees) => {
    const r = await http.post('/classes', donnees)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Vérifier la disponibilité d'une classe
   */
  verifierDisponibilite: async (classeUuid) => {
    const r = await http.get(`/classes/${classeUuid}/disponibilite`)
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Lister les apprenants
   */
  listerApprenants: async (filtres = {}) => {
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const qs = params.toString()
    const r = await http.get(`/apprenants${qs ? '?' + qs : ''}`)
    return r?.donnees ?? r?.data ?? r ?? []
  },

  /**
   * Transférer ou muter un apprenant
   */
  transfererApprenant: async (apprenantUuid, nouvelleClasseUuid, motif = '') => {
    const r = await http.post(`/apprenants/${apprenantUuid}/transfert`, {
      nouvelle_classe_uuid: nouvelleClasseUuid,
      motif,
    })
    return r?.donnees ?? r?.data ?? r
  },

  /**
   * Lister les emplois du temps
   */
  listerEmploisDuTemps: async (filtres = {}) => {
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const qs = params.toString()
    const r = await http.get(`/emplois-du-temps${qs ? '?' + qs : ''}`)
    return r?.donnees ?? r?.data ?? r ?? []
  },

  /**
   * Enregistrer un créneau d'emploi du temps
   */
  enregistrerCreneauEdt: async (donnees) => {
    const r = await http.post('/emplois-du-temps', donnees)
    return r?.donnees ?? r?.data ?? r
  },
}
