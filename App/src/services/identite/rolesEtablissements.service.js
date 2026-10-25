/**
 * Service — Demandes de rôle et assignations rôle ↔ établissements.
 */
import { authApi as api } from '../../lib/commun/http'

// ── Côté admin établissement ──────────────────────────────────────────
export const demandesRoleEtabService = {
  listerMesDemandes: () =>
    api.get('/roles/mes-demandes'),

  soumettre: (body) =>
    api.post('/roles/demandes', body),

  annuler: (uuid) =>
    api.delete(`/roles/demandes/${uuid}`),
}

// ── Côté super admin ──────────────────────────────────────────────────
export const demandesRoleAdminService = {
  listerToutesDemandes: (statut = 'en_attente') =>
    api.get(`/roles/demandes?statut=${statut}`),

  accepter: (uuid, body) =>
    api.post(`/roles/demandes/${uuid}/accepter`, body),

  refuser: (uuid, note) =>
    api.post(`/roles/demandes/${uuid}/refuser`, { note }),
}

// ── Assignations rôle ↔ établissements ────────────────────────────────
export const rolesEtablissementsService = {
  etablissementsParRole: (roleUuid) =>
    api.get(`/roles/${roleUuid}/etablissements`),

  assigner: (roleUuid, etablissementUuids) =>
    api.post(`/roles/${roleUuid}/etablissements`, { etablissementUuids }),

  retirer: (assignationUuid) =>
    api.delete(`/roles/etablissements/${assignationUuid}`),

  rolesParEtablissement: (etablissementUuid) =>
    api.get(`/roles/etablissements/${etablissementUuid}/roles`),
}
