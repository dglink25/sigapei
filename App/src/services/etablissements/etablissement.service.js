import { createHttp } from '../../lib/commun/http'
import { ADMIN_BASE, API_BASE } from '../../config/etablissements/config'

const api = createHttp(API_BASE)
const adminApi = createHttp(ADMIN_BASE)
const PUBLIC = { auth: false }

/** Les listes sont enveloppees : { success, pays: [...] } / { departements: [...] } / { demandes: [...] } */
function listFrom(r, ...keys) {
  for (const k of keys) if (Array.isArray(r?.[k])) return r[k]
  if (Array.isArray(r)) return r
  if (Array.isArray(r?.data)) return r.data
  const any = r && typeof r === 'object' ? Object.values(r).find(Array.isArray) : null
  return any ?? []
}
const norm = (i) => ({ uuid: i.uuid, nom: i.nom ?? i.name ?? i.libelle ?? '', code_iso: i.code_iso ?? i.codeIso ?? '', indicatif_tel: i.indicatif_tel ?? i.indicatifTel ?? '' })

/* Referentiel geographique : peu volatil -> cache memoire cote navigateur */
const cache = new Map()
function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((e) => { cache.delete(key); throw e }))
  return cache.get(key)
}
const loadGeo = (key, path, listKey) =>
  cached(key, async () => listFrom(await api.get(path, PUBLIC), listKey).map(norm).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))

export const geoService = {
  pays: () => loadGeo('pays', '/geo/pays', 'pays'),
  departements: (uuid) => loadGeo(`d:${uuid}`, `/geo/pays/${uuid}/departements`, 'departements'),
  communes: (uuid) => loadGeo(`c:${uuid}`, `/geo/departements/${uuid}/communes`, 'communes'),
  arrondissements: (uuid) => loadGeo(`a:${uuid}`, `/geo/communes/${uuid}/arrondissements`, 'arrondissements'),
}

export const accueilService = {
  /** GET /v1/etablissements/{slug}/accueil — public, sans auth */
  lire: async (slug) => {
    const r = await api.get(`/etablissements/${slug}/accueil`, PUBLIC)
    return r?.accueil ?? r
  },
}

export const demandeService = {
  /** Cree (sans uuid) ou fusionne (avec uuid) le brouillon -> { success, demandeUuid, statut } */
  enregistrerBrouillon: (payload) => api.post('/demandes', payload, PUBLIC),
  /** -> { success, demandeUuid, statut: 'soumise', dateSoumission } */
  soumettre: (uuid, captchaToken) =>
    api.post(`/demandes/${uuid}/soumettre`, { confirmationAuthenticite: true, acceptationConditions: true, captchaToken }, PUBLIC),
}

export const correctionService = {
  /** -> { success, demandeUuid, champsACorriger: { section: motif }, donneesFormulaire } */
  afficher: (token) => api.get(`/corrections/${encodeURIComponent(token)}`, PUBLIC),
  /** -> { success, demandeUuid, statut: 'soumise' } */
  soumettre: (token, payload) => api.post(`/corrections/${encodeURIComponent(token)}`, payload, PUBLIC),
}

/** Back-office Super Administrateur : routes /interne/* (X-Internal-Secret ajoute par le proxy / la Gateway). */
export const adminService = {
  lister: async () => listFrom(await adminApi.get('/interne/demandes'), 'demandes', 'items'),
  afficher: async (uuid) => {
    const r = await adminApi.get(`/interne/demandes/${uuid}`)
    return r?.demande ?? r
  },
  marquerCorrections: (uuid, champsACorriger) => adminApi.post(`/interne/demandes/${uuid}/corrections`, { champsACorriger }),
  valider: (uuid) => adminApi.post(`/interne/demandes/${uuid}/valider`),
  listerEtablissements: async () => listFrom(await adminApi.get('/interne/etablissements'), 'etablissements', 'items'),
  suspendreEtablissement: (uuid) => adminApi.post(`/interne/etablissements/${uuid}/suspendre`),
  reactiverEtablissement: (uuid) => adminApi.post(`/interne/etablissements/${uuid}/reactiver`),
}
