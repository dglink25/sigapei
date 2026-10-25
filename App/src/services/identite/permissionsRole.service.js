/**
 * Service - Permissions par rôle (services + portail).
 */
import { authApi as api } from '../../lib/commun/http'

export const permissionsRoleService = {
  listerRoles:        ()                         => api.get('/permissions-roles'),
  droitsParService:   (roleUuid)                 => api.get(`/permissions-roles/${roleUuid}/services`),
  definirService:     (roleUuid, serviceUuid, accorde) =>
    api.put(`/permissions-roles/${roleUuid}/services/${serviceUuid}`, { accorde }),
  definirPortail:     (roleUuid, peutVoirPortail) =>
    api.put(`/permissions-roles/${roleUuid}/portail`, { peutVoirPortail }),
}
