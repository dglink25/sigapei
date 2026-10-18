import { authApi as api } from '../../lib/commun/http'
import { API_BASE } from '../../config/etablissements/config'
import { ENV } from '../../config/commun/env'

/**
 * Construit l'URL publique du logo depuis son UUID de document.
 * Route publique GET /v1/documents/:uuid servie par le microservice établissements.
 */
function logoDocumentUrl(logoDocumentId) {
  if (!logoDocumentId) return null
  return `${API_BASE}${ENV.apiPrefix}/documents/${logoDocumentId}`
}

/**
 * Portail de l'utilisateur : établissement (slug, nom, logoUrl), indicateur administrateur,
 * services et état d'accès.
 * logoUrl est construit localement depuis logoDocumentId pour éviter un second appel réseau.
 */
export const portailService = {
  lire: async () => {
    const r = await api.get('/moi/portail')
    // Enrichir l'établissement avec logoUrl construit depuis logoDocumentId
    if (r?.etablissement && r.etablissement.logoDocumentId) {
      r.etablissement.logoUrl = logoDocumentUrl(r.etablissement.logoDocumentId)
    } else if (r?.etablissement) {
      r.etablissement.logoUrl = null
    }
    return r
  },
}
