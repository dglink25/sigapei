/**
 * Client API - Configuration académique.
 *
 * Routes sous /interne/mon-etablissement/configuration/* protégées par :
 *   1. secret.interne  → X-Internal-Secret, injecté par le proxy Vite
 *   2. contexte.tenant → X-User-Role + X-Tenant-Uuid, lus du JWT local
 *      (même pattern que monEtablissement.service.js)
 */
import { createHttp } from '../../lib/commun/http'
import { tokenStore, decodeJwt } from '../../lib/identite/tokenStore'
import { ADMIN_BASE } from '../../config/etablissements/config'

const base = createHttp(ADMIN_BASE)
const CFG  = '/interne/mon-etablissement/configuration'

/** Extrait roleCode et tenantId du JWT d'accès courant. */
function headersContexte() {
  const payload  = decodeJwt(tokenStore.getAccess() ?? '')
  const roleCode = payload?.roleCode ?? payload?.role ?? ''
  const tenantId = payload?.tenantId ?? payload?.tenant_id ?? ''
  const headers  = {}
  if (roleCode) headers['X-User-Role']   = roleCode
  if (tenantId) headers['X-Tenant-Uuid'] = tenantId
  return headers
}

/** Instance HTTP avec les headers de contexte tenant prêts. */
const api = () => base.withHeaders(headersContexte())

// ── Années académiques ─────────────────────────────────────────────────
export const anneesService = {
  lister:   ()             => api().get(`${CFG}/annees`),
  afficher: (uuid)         => api().get(`${CFG}/annees/${uuid}`),
  creer:    (body)         => api().post(`${CFG}/annees`, body),
  modifier: (uuid, body)   => api().patch(`${CFG}/annees/${uuid}`, body),
  suspendre:(uuid, note)   => api().post(`${CFG}/annees/${uuid}/suspendre`, { note }),
  reactiver:(uuid)         => api().post(`${CFG}/annees/${uuid}/reactiver`),
}

// ── Cycles ────────────────────────────────────────────────────────────
export const cyclesService = {
  lister:      (anneeUuid) => api().get(`${CFG}/cycles${anneeUuid ? `?annee_uuid=${anneeUuid}` : ''}`),
  enregistrer: (body)      => api().post(`${CFG}/cycles`, body),
}

// ── Subdivisions ──────────────────────────────────────────────────────
export const subdivisionsService = {
  lister:  (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api().get(`${CFG}/subdivisions${qs ? `?${qs}` : ''}`)
  },
  creer:   (body)        => api().post(`${CFG}/subdivisions`, body),
  modifier:(uuid, body)  => api().patch(`${CFG}/subdivisions/${uuid}`, body),
}

// ── Niveaux ───────────────────────────────────────────────────────────
export const niveauxService = {
  lister:  (cycle)       => api().get(`${CFG}/niveaux${cycle ? `?cycle=${cycle}` : ''}`),
  creer:   (body)        => api().post(`${CFG}/niveaux`, body),
  modifier:(uuid, body)  => api().patch(`${CFG}/niveaux/${uuid}`, body),
}

// ── Séries / Filières ─────────────────────────────────────────────────
export const seriesService = {
  lister:  (cycle)       => api().get(`${CFG}/series${cycle ? `?cycle=${cycle}` : ''}`),
  creer:   (body)        => api().post(`${CFG}/series`, body),
  modifier:(uuid, body)  => api().patch(`${CFG}/series/${uuid}`, body),
}

// ── Classes concrètes ─────────────────────────────────────────────────
export const classesService = {
  lister:  (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api().get(`${CFG}/classes${qs ? `?${qs}` : ''}`)
  },
  creer:   (body)        => api().post(`${CFG}/classes`, body),
  modifier:(uuid, body)  => api().patch(`${CFG}/classes/${uuid}`, body),
}

// ── Cohortes universitaires ───────────────────────────────────────────
export const cohortesService = {
  lister:  (anneeUuid)   => api().get(`${CFG}/cohortes${anneeUuid ? `?annee_uuid=${anneeUuid}` : ''}`),
  creer:   (body)        => api().post(`${CFG}/cohortes`, body),
}

// ── Matières ──────────────────────────────────────────────────────────
export const matieresService = {
  lister:  (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api().get(`${CFG}/matieres${qs ? `?${qs}` : ''}`)
  },
  creer:             (body)  => api().post(`${CFG}/matieres`, body),
  modifier:    (uuid, body)  => api().patch(`${CFG}/matieres/${uuid}`, body),
  previewPropagation: (uuid) => api().get(`${CFG}/matieres/${uuid}/propagation`),
  propager:           (uuid) => api().post(`${CFG}/matieres/${uuid}/propager`),
}
