import { Injectable } from '@nestjs/common';
import { DependanceIndisponible } from '../common/erreurs/erreurs';
import { charge, HttpInterneService } from '../common/http/http-interne.service';

export interface EligibiliteBulletins {
  eligible: boolean;
  bulletins: {
    bulletin_uuid: string;
    periode_uuid: string;
    periode: string;
    annee_scolaire: string;
    version: number;
  }[];
}

/** Evaluations : bulletins archives disponibles (GET /v1/interne/eligibilite-document/{apprenant_uuid}). */
@Injectable()
export class EvaluationsClient {
  constructor(private readonly http: HttpInterneService) {}

  async bulletins(apprenantUuid: string, tenantId: number): Promise<EligibiliteBulletins> {
    const d = charge<EligibiliteBulletins>(
      await this.http.get('evaluations', `/v1/interne/eligibilite-document/${apprenantUuid}`, {}, tenantId),
    );
    if (!d || typeof d.eligible !== 'boolean' || !Array.isArray(d.bulletins)) {
      throw new DependanceIndisponible('Evaluations : reponse eligibilite-document inattendue.');
    }
    return d;
  }
}
