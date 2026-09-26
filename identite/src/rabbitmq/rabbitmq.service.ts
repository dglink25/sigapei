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

  /** Publication fire-and-forget d'un evenement metier (pattern = routing key). */
  publier(evenement: EvenementIdentite, payload: Record<string, unknown>): void {
    this.client.emit(evenement, {
      evenement,
      emisLe: new Date().toISOString(),
      service: 'api-identite',
      ...payload,
    });
  }

  /** Appel RPC synchrone (avec timeout) vers un autre microservice via RabbitMQ. */
  async appeler<T>(pattern: string, payload: Record<string, unknown>, timeoutMs = 5000): Promise<T> {
    return firstValueFrom(this.client.send<T>(pattern, payload).pipe(timeout(timeoutMs)));
  }
}
