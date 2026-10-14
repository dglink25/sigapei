import { EtablissementService } from './etablissement-service.entity';
import { Service } from '../services/service.entity';
import { EtablissementRef } from '../etablissements-ref/etablissements-ref.service';

/** Representation publique d'une assignation : uuid uniquement, jamais d'id interne. */
export function versAssignationPublique(es: EtablissementService, service: Service, etab?: EtablissementRef) {
  return {
    uuid: es.uuid,
    service: { uuid: service.uuid, code: service.code, nom: service.nom, status: service.status },
    ...(etab ? { etablissement: { uuid: etab.uuid, nom: etab.nom, statut: etab.statut } } : {}),
    status: es.status,
    motif: es.motif,
    createdAt: es.createdAt,
    updatedAt: es.updatedAt,
  };
}
