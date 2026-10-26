/**
 * Service - Assignations rôle ↔ établissements.
 * Miroir de servicesAcces.service.js - préfixe /roles-etablissements.
 */
import { authApi as api } from '../../lib/commun/http'

const A = '/roles-etablissements'

// ── Assignations rôle ↔ établissements (super admin) ─────────────────
export const rolesEtablissementsService = {
  /** Résumé : nb rôles personnalisés par établissement. */
  resume: () => api.get(`${A}/resume`),

  /** Établissements ayant accès à un rôle. */
  etablissementsParRole: (roleUuid) =>
    api.get(`${A}/roles/${roleUuid}`),

  /** Assigner un rôle à des établissements. */
  assigner: (roleUuid, etablissementUuids) =>
    api.post(A, { roleUuid, etablissementUuids }),

  /** Retirer un rôle d'un établissement (par uuid de l'assignation). */
  retirer: (assignationUuid) =>
    api.delete(`${A}/${assignationUuid}`),

  /** Rôles d'un établissement (personnalisés + système utilisés). */
  rolesParEtablissement: (etablissementUuid) =>
    api.get(`${A}/etablissements/${etablissementUuid}`),
}

// ── Demandes de rôle - côté admin établissement ───────────────────────
export const demandesRoleEtabService = {
  listerMesDemandes: () =>
    api.get('/roles/mes-demandes'),

  soumettre: (body) =>
    api.post('/roles/demandes', body),

  annuler: (uuid) =>
    api.delete(`/roles/demandes/${uuid}`),
}

// ── Demandes de rôle - côté super admin ──────────────────────────────
export const demandesRoleAdminService = {
  listerToutesDemandes: (statut = 'en_attente') =>
    api.get(`/roles/demandes?statut=${statut}`),

  accepter: (uuid, body) =>
    api.post(`/roles/demandes/${uuid}/accepter`, body),

  refuser: (uuid, note) =>
    api.post(`/roles/demandes/${uuid}/refuser`, { note }),
}
