import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { RabbitmqService } from './rabbitmq.service';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('rabbitmq.url')!],
            queue: config.get<string>('rabbitmq.queueIdentite'),
            queueOptions: { durable: true },
            persistent: true,
            noAck: true,        // fire-and-forget : pas de ACK attendu pour les émissions
          },
        });
      },
    },
    RabbitmqService,
  ],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
