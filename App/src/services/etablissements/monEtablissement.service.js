import { createHttp } from '../../lib/commun/http'
import { tokenStore, decodeJwt } from '../../lib/identite/tokenStore'
import { ADMIN_BASE } from '../../config/etablissements/config'

/**
 * Profil de l'établissement de l'administrateur connecté.
 *
 * Routes /interne/mon-etablissement : protégées par deux middlewares Laravel :
 *   1. secret.interne  → X-Internal-Secret, injecté par le proxy Vite (jamais exposé au navigateur)
 *   2. contexte.tenant → X-User-Role + X-Tenant-Uuid, que la Gateway injecte en production
 *      après vérification du JWT. En développement, le proxy Vite ne joue pas ce rôle :
 *      on les décode nous-mêmes depuis le JWT stocké localement et on les envoie
 *      directement dans les headers de la requête.
 *
 * Sécurité : ces valeurs sont lues du JWT signé par api-identite - elles ne peuvent
 * pas être falsifiées par l'utilisateur (le backend les re-vérifie de toute façon
 * côté Gateway en production ; en dev le secret interne suffit à limiter l'accès).
 */

const base = createHttp(ADMIN_BASE)

/** Extrait roleCode et tenantId du JWT d'accès courant. */
function headersContexte() {
  const payload = decodeJwt(tokenStore.getAccess() ?? '')
  const roleCode  = payload?.roleCode ?? payload?.role ?? ''
  const tenantId  = payload?.tenantId ?? payload?.tenant_id ?? ''
  const headers = {}
  if (roleCode)  headers['X-User-Role']   = roleCode
  if (tenantId)  headers['X-Tenant-Uuid'] = tenantId
  return headers
}

export const monEtablissementService = {
  /** → profil { uuid, code, slug, matricule, nom, types, adresseComplete, localisation, geolocalisation, contact, … } */
  lire: async () => {
    const r = await base.withHeaders(headersContexte()).get('/interne/mon-etablissement')
    return r?.etablissement ?? r
  },

  /** PATCH partiel : uniquement types, adresse_complete, localisation, geolocalisation. */
  modifier: async (payload) => {
    const r = await base.withHeaders(headersContexte()).patch('/interne/mon-etablissement', payload)
    return r?.etablissement ?? r
  },

  /** Remplace le logo de l'établissement (multipart/form-data). */
  remplacerLogo: async (formData) => {
    const r = await base.withHeaders(headersContexte()).post('/interne/mon-etablissement/logo', formData)
    return r
  },
}
