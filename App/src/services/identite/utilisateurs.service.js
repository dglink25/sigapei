/**
 * Service - Gestion des utilisateurs et des rôles.
 * Routes : /v1/utilisateurs et /v1/roles (NestJS api-identite via authApi)
 */
import { authApi as api } from '../../lib/commun/http'

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const utilisateursService = {
  // ── Utilisateurs ──────────────────────────────────────────────────
  /** Filtres : q, nomEtablissement, roleCode, annee, tenantId, page, limite */
  lister: (params = {}) => api.get(`/utilisateurs${qs(params)}`),

  creer: (body) => api.post('/utilisateurs', body),

  obtenir: (uuid) => api.get(`/utilisateurs/${uuid}`),

  assignerRole: (uuid, roleUuid) =>
    api.patch(`/utilisateurs/${uuid}/role`, { roleUuid }),

  modifierStatut: (uuid, statut) =>
    api.patch(`/utilisateurs/${uuid}/statut`, { statut }),

  // ── Rôles ─────────────────────────────────────────────────────────
  listerRoles: (tenantId) => api.get(`/roles${tenantId ? `?tenantId=${tenantId}` : ''}`),

  creerRole: (body) => api.post('/roles', body),

  modifierRole: (uuid, body) => api.put(`/roles/${uuid}`, body),

  supprimerRole: (uuid) => api.delete(`/roles/${uuid}`),
}
