import { Injectable } from '@nestjs/common';
import { DependanceIndisponible } from '../common/erreurs/erreurs';
import { charge, HttpInterneService } from '../common/http/http-interne.service';

export interface SoldeApprenant {
  a_jour: boolean;
  montant_echu_impaye: number;
  en_retard_depuis: string | null;
}

/** Finances : situation d'un apprenant (GET /v1/interne/solde/{apprenant_uuid}). « À jour » = aucune échéance passée impayée. */
@Injectable()
export class FinancesClient {
  constructor(private readonly http: HttpInterneService) {}

  async solde(apprenantUuid: string, tenantId: number): Promise<SoldeApprenant> {
    const d = charge<SoldeApprenant>(await this.http.get('finances', `/v1/interne/solde/${apprenantUuid}`, {}, tenantId));
    if (!d || typeof d.a_jour !== 'boolean') {
      throw new DependanceIndisponible('Finances : reponse solde inattendue.');
    }
    return d;
  }
}
