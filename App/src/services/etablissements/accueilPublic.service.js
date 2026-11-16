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

/** Normalise logoDocumentId → logoUrl et les images imbriquées */
function normaliser(data) {
  if (!data) return data
  if (data.logoDocumentId && !data.logoUrl) {
    data.logoUrl = logoUrl(data.logoDocumentId)
  }
  if (Array.isArray(data.hero)) {
    data.hero = data.hero.map((s) => ({
      ...s,
      imageUrl: s.imageUrl ?? (s.imageDocumentId ? logoUrl(s.imageDocumentId) : null),
    }))
  }
  if (Array.isArray(data.actualites)) {
    data.actualites = data.actualites.map((a) => ({
      ...a,
      imageUrl: a.imageUrl ?? (a.imageDocumentId ? logoUrl(a.imageDocumentId) : null),
    }))
  }
  return data
}

/* ── Lecture publique (visiteur) ───────────────────────────────────── */
export const accueilPublicService = {
  lire: async (slug) => {
    const r = await api.get(`/etablissements/${slug}/accueil`, PUBLIC)
    return normaliser(r?.accueil ?? r)
  },
}

/* ── Gestion admin (administrateur de l'établissement) ──────────────
 *
 * Routes backend :
 *   GET  /interne/mon-etablissement/page-accueil
 *   PUT  /interne/mon-etablissement/page-accueil/{section}
 *
 * Sections : hero | statistiques | apropos | galerie | actualites | reseaux-sociaux
 * ─────────────────────────────────────────────────────────────────── */
export const accueilAdminService = {
  /** Lire la configuration complète */
  lire: async () => {
    const r = await adminApi.withHeaders(headersContexte()).get('/interne/mon-etablissement/page-accueil')
    return normaliser(r?.accueil ?? r)
  },

  /**
   * Mettre à jour une section.
   * @param {'hero'|'statistiques'|'apropos'|'galerie'|'actualites'|'reseaux-sociaux'} section
   * @param {object} data  corps correspondant à la section
   */
  mettreAJour: async (section, data) => {
    const r = await adminApi
      .withHeaders(headersContexte())
      .put(`/interne/mon-etablissement/page-accueil/${section}`, data)
    return r
  },

  /** Upload d'une image (slide hero, actualité, galerie) → retourne l'URL */
  uploadImage: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('image', file)
    const r = await adminApi
      .withHeaders(headersContexte())
      .post('/interne/mon-etablissement/page-accueil/images', formData, {
        onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
    return r?.imageUrl ?? r?.url ?? null
  },
}
