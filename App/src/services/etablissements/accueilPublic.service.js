import { createHttp } from '../../lib/commun/http'
import { API_BASE, ADMIN_BASE } from '../../config/etablissements/config'
import { ENV } from '../../config/commun/env'
import { tokenStore, decodeJwt } from '../../lib/identite/tokenStore'

const api      = createHttp(API_BASE)
const adminApi = createHttp(ADMIN_BASE)
const PUBLIC   = { auth: false }

function logoUrl(id) {
  if (!id) return null
  return `${API_BASE}${ENV.apiPrefix}/documents/${id}`
}

function headersContexte() {
  const payload = decodeJwt(tokenStore.getAccess() ?? '')
  const roleCode = payload?.roleCode ?? payload?.role ?? ''
  const tenantId = payload?.tenantId ?? payload?.tenant_id ?? ''
  const headers  = {}
  if (roleCode) headers['X-User-Role']   = roleCode
  if (tenantId) headers['X-Tenant-Uuid'] = tenantId
  return headers
}

/** Normalise la réponse de l'API pour s'assurer que logoUrl est présent */
function normaliser(data) {
  if (!data) return data
  if (data.logoDocumentId && !data.logoUrl) {
    data.logoUrl = logoUrl(data.logoDocumentId)
  }
  // Normaliser les images des slides hero
  if (Array.isArray(data.hero)) {
    data.hero = data.hero.map((s) => ({
      ...s,
      imageUrl: s.imageUrl ?? (s.imageDocumentId ? logoUrl(s.imageDocumentId) : null),
    }))
  }
  // Normaliser les images des formations
  if (Array.isArray(data.formations)) {
    data.formations = data.formations.map((f) => ({
      ...f,
      imageUrl: f.imageUrl ?? (f.imageDocumentId ? logoUrl(f.imageDocumentId) : null),
    }))
  }
  // Normaliser les images des actualités
  if (Array.isArray(data.actualites)) {
    data.actualites = data.actualites.map((a) => ({
      ...a,
      imageUrl: a.imageUrl ?? (a.imageDocumentId ? logoUrl(a.imageDocumentId) : null),
    }))
  }
  return data
}

/** Lecture publique de l'accueil d'un établissement */
export const accueilPublicService = {
  lire: async (slug) => {
    const r = await api.get(`/etablissements/${slug}/accueil`, PUBLIC)
    return normaliser(r?.accueil ?? r)
  },
}

/** Gestion de la page d'accueil par l'administrateur de l'établissement */
export const accueilAdminService = {
  /** Lire la configuration complète de la page d'accueil */
  lire: async () => {
    const r = await adminApi.withHeaders(headersContexte()).get('/interne/mon-etablissement/accueil')
    return normaliser(r?.accueil ?? r)
  },

  /** Mettre à jour une section (hero, statistiques, formations, apropos, galerie, actualites) */
  mettreAJour: async (section, data) => {
    const r = await adminApi.withHeaders(headersContexte()).put(
      `/interne/mon-etablissement/accueil/${section}`,
      data,
    )
    return r
  },

  /** Upload d'une image (slide hero, formation, actualité, galerie) */
  uploadImage: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('image', file)
    const r = await adminApi.withHeaders(headersContexte()).post(
      '/interne/mon-etablissement/accueil/images',
      formData,
      { onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100)) },
    )
    return r?.imageUrl ?? r?.url ?? null
  },
}
