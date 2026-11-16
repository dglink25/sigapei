import { Injectable } from '@nestjs/common';
import { charge, HttpInterneService } from '../common/http/http-interne.service';

export interface Personnel {
  uuid: string;
  utilisateur_uuid: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  nom_complet?: string;
  fonction?: string;
  type_personnel?: string;
  statut?: string;
  actif?: boolean;
}

/** Ressources humaines : dossier du personnel lie a un compte (GET /v1/interne/personnel/utilisateur/{uuid}). */
@Injectable()
export class RhClient {
  constructor(private readonly http: HttpInterneService) {}

  async personnelDuCompte(utilisateurUuid: string, tenantId: number): Promise<Personnel | null> {
    const p = charge<Personnel>(
      await this.http.get('rh', `/v1/interne/personnel/utilisateur/${utilisateurUuid}`, { tenant_id: tenantId }, tenantId),
    );
    return p && typeof p === 'object' && p.utilisateur_uuid === utilisateurUuid ? p : null;
  }
}
