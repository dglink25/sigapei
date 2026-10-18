import { Service } from './service.entity';

/** Representation publique : jamais d'id interne, uniquement l'uuid. */
export function versServicePublic(s: Service) {
  return {
    uuid: s.uuid,
    code: s.code,
    nom: s.nom,
    description: s.description,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
