/**
 * Registre des agrégateurs : fournit l'adaptateur approprié par code.
 * Injecté dans les services métier pour découpler le code de l'agrégateur concret.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { IAgregateur } from './agregateur.interface';
import { FedapayAdapter } from './fedapay.adapter';
import { KkiapayAdapter } from './kkiapay.adapter';
import { CinetpayAdapter } from './cinetpay.adapter';

@Injectable()
export class AgregateurRegistre {
  private readonly map = new Map<string, IAgregateur>();

  constructor(
    private readonly fedapay: FedapayAdapter,
    private readonly kkiapay: KkiapayAdapter,
    private readonly cinetpay: CinetpayAdapter,
  ) {
    this.map.set('fedapay', fedapay);
    this.map.set('kkiapay', kkiapay);
    this.map.set('cinetpay', cinetpay);
  }

  obtenir(code: string): IAgregateur {
    const ag = this.map.get(code.toLowerCase());
    if (!ag) throw new NotFoundException({ code: 'AGREGATEUR_INCONNU', message: `Agrégateur inconnu : ${code}` });
    return ag;
  }

  tous(): IAgregateur[] {
    return [...this.map.values()];
  }
}
