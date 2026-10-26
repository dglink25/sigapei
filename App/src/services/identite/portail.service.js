import { authApi as api } from '../../lib/commun/http'
import { API_BASE } from '../../config/etablissements/config'
import { ENV } from '../../config/commun/env'
import { sauvegarderSlugEtablissement } from '../../lib/etablissements/subdomain'


function logoDocumentUrl(logoDocumentId) {
  if (!logoDocumentId) return null
  return `${API_BASE}${ENV.apiPrefix}/documents/${logoDocumentId}`
}


export const portailService = {
  lire: async () => {
    const r = await api.get('/moi/portail')
    if (r?.etablissement) {
      // Sauvegarder le slug pour la redirection post-déconnexion
      if (r.etablissement.slug) sauvegarderSlugEtablissement(r.etablissement.slug)
      if (r.etablissement.logoDocumentId) {
        r.etablissement.logoUrl = logoDocumentUrl(r.etablissement.logoDocumentId)
      } else {
        r.etablissement.logoUrl = null
      }
    }
    return r
  },
}
