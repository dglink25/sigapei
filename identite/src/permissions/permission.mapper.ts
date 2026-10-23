import { PermissionRole } from './permission-role.entity';
import { Role } from '../roles/role.entity';
import { Service } from '../services/service.entity';

/** Representation publique : jamais d'id interne, uniquement l'uuid. */
export function versPermissionPublique(p: PermissionRole, role?: Role, service?: Service) {
  return {
    uuid: p.uuid,
    ...(role ? { role: { uuid: role.uuid, code: role.code, libelle: role.libelle } } : {}),
    ...(service
      ? { service: { uuid: service.uuid, code: service.code, nom: service.nom, status: service.status } }
      : {}),
    action: p.action,
    autorise: p.autorise,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
