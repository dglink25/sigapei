import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';

export type EvenementIdentite =
  | 'utilisateur.authentifie'
  | 'utilisateur.deconnecte'
  | 'otp.envoye'
  | 'otp.verifie'
  | 'otp.echec'
  | 'role.cree'
  | 'role.modifie'
  | 'role.supprime'
  | 'service.cree'
  | 'service.modifie'
  | 'service.supprime'
  | 'etablissement_service.assigne'
  | 'etablissement_service.bloque'
  | 'etablissement_service.reactive'
  | 'etablissement_service.retire'
  | 'acces.accorde'
  | 'acces.revoque'
  | 'appareil.revoque'
  | 'identifiant.recupere';

@Injectable()
export class RabbitmqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connecte a RabbitMQ');
    } catch (err) {
      this.logger.error(`Connexion RabbitMQ impossible: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  /** Publication fire-and-forget d'un événement métier.
   *  Ces événements sont destinés à api-communication (futur microservice).
   *  Tant qu'il n'est pas déployé, on log en debug et on ignore.
   */
  publier(evenement: EvenementIdentite, payload: Record<string, unknown>): void {
    // TODO : activer quand api-communication sera déployé
    // Pour l'instant on évite le bruit "no matching event handler" dans les logs.
    this.logger.debug(`[evt] ${evenement} - ${JSON.stringify(payload).slice(0, 80)}…`);
  }

  /** Appel RPC synchrone (avec timeout) vers un autre microservice via RabbitMQ. */
  async appeler<T>(pattern: string, payload: Record<string, unknown>, timeoutMs = 5000): Promise<T> {
    return firstValueFrom(this.client.send<T>(pattern, payload).pipe(timeout(timeoutMs)));
  }
}
