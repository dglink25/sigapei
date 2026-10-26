import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as dns from 'node:dns';
import * as net from 'node:net';
import { AppModule } from './app.module';

dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  app.use(helmet());

  // CORS_ORIGINS accepte des jokers de sous-domaine, ex: https://sigapei.com,https://*.sigapei.com
  const origines = config.get<string[]>('corsOrigins') ?? [];
  const motifs = origines.map((o) =>
    o.includes('*') ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\*]/g, '\\$&').replace(/\\\*/g, '[a-z0-9-]+')}$`, 'i') : o,
  );
  app.enableCors({
    origin: origines.length
      ? (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
          cb(null, !origin || motifs.some((m) => (typeof m === 'string' ? m === origin : m.test(origin))))
      : false,
    credentials: true,
  });

  app.setGlobalPrefix(config.get<string>('apiPrefix')!, { exclude: ['sante'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const port = config.get<number>('port')!;
  await app.listen(port, '0.0.0.0');
  logger.log(`api-paiement demarre sur le port ${port}`);
}

bootstrap();
