/**
 * Appels à candidature - lecture publique (sans authentification).
 * Utilise fetch() natif directement vers le microservice inscription.
 * CORS autorisé côté backend (Access-Control-Allow-Origin: *).
 */
import { ENV } from '../../config/commun/env'

const BASE = (ENV.services.inscription || 'http://localhost:4003').replace(/\/+$/, '')

async function getPublic(path) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export const appelsPublicsService = {
  /** Lister tous les appels d'un établissement par slug ou UUID */
  listerTous: async (etablissementUuid, slug) => {
    const params = new URLSearchParams()
    if (etablissementUuid) params.set('etablissement_uuid', etablissementUuid)
    else if (slug) params.set('slug', slug)
    const r = await getPublic(`/v1/public/appels-candidatures?${params}`)
    return Array.isArray(r?.data) ? r.data : []
  },

  /** Lister par cycle */
  listerParCycle: async (etablissementUuid, cycle) => {
    const params = new URLSearchParams({ etablissement_uuid: etablissementUuid, cycle })
    const r = await getPublic(`/v1/public/appels-candidatures?${params}`)
    return Array.isArray(r?.data) ? r.data : []
  },

  /** Détail d'un appel */
  afficher: async (uuid) => {
    const r = await getPublic(`/v1/public/appels-candidatures/${uuid}`)
    return r?.data ?? null
  },
}
