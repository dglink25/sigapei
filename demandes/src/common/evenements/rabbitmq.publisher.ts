import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';

/**
 * Evenements vers Communication (CDC §16.1) sur l'echange topic de la plateforme.
 * Appele APRES validation de la transaction : un evenement ne decrit jamais un etat annule.
 * Message persistant, connexion geree avec reconnexion ; un echec est journalise sans casser l'action.
 */
@Injectable()
export class RabbitMqPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisher.name);
  private connexion?: amqp.AmqpConnectionManager;
  private canal?: amqp.ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  private obtenirCanal(): amqp.ChannelWrapper | null {
    const url = this.config.get<string>('rabbitmq.url');
    if (!url) return null;
    if (!this.canal) {
      const echange = this.config.get<string>('rabbitmq.exchange') ?? 'sigapei.events';
      this.connexion = amqp.connect([url]);
      this.canal = this.connexion.createChannel({
        json: true,
        setup: (c: any) => c.assertExchange(echange, 'topic', { durable: true }),
      });
    }
    return this.canal;
  }

  async publier(cle: string, charge: Record<string, unknown>): Promise<void> {
    try {
      const canal = this.obtenirCanal();
      if (!canal) return;
      const echange = this.config.get<string>('rabbitmq.exchange') ?? 'sigapei.events';
      await canal.publish(
        echange,
        cle,
        {
          evenement: cle,
          source: 'demandes',
          emis_le: new Date().toISOString(),
          ...charge,
        },
        {
          persistent: true,
          contentType: 'application/json',
        } as any,
      );
    } catch (e) {
      this.logger.error(`[EVENEMENT_NON_PUBLIE] ${cle} : ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.canal?.close().catch(() => undefined);
    await this.connexion?.close().catch(() => undefined);
  }
}
