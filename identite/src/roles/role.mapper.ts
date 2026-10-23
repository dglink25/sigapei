import { Role } from './role.entity';

/** Representation publique : jamais d'id interne, uniquement l'uuid. */
export function versRolePublic(r: Role) {
  return {
    uuid: r.uuid,
    code: r.code,
    libelle: r.libelle,
    familleAuth: r.familleAuth,
    estPersonnalise: r.estPersonnalise,
    tenantId: r.tenantId,
    dateCreation: r.dateCreation,
    dateModification: r.dateModification,
  };
}
