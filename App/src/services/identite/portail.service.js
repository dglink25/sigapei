import { authApi as api } from '../../lib/commun/http'
import { API_BASE } from '../../config/etablissements/config'
import { ENV } from '../../config/commun/env'
import { sauvegarderSlugEtablissement } from '../../lib/etablissements/subdomain'
import { persistentStorage } from '../stockage/persistentStorage.service'

function logoDocumentUrl(logoDocumentId) {
  if (!logoDocumentId) return null
  return `${API_BASE}${ENV.apiPrefix}/documents/${logoDocumentId}`
}

export const portailService = {
  lire: async ({ fresh = false } = {}) => {
    const fetcher = async () => {
      const r = await api.get('/moi/portail')
      if (r?.etablissement) {
        if (r.etablissement.slug) sauvegarderSlugEtablissement(r.etablissement.slug)
        if (r.etablissement.logoDocumentId) {
          r.etablissement.logoUrl = logoDocumentUrl(r.etablissement.logoDocumentId)
        } else {
          r.etablissement.logoUrl = null
        }
      }
      return r
    }

    if (fresh) {
      const res = await fetcher()
      persistentStorage.set('sigapei_portail_info', res, 1000 * 60 * 60) // 1h
      return res
    }

    return persistentStorage.getOrRevalidate('sigapei_portail_info', fetcher, 1000 * 60 * 60)
  },
}
