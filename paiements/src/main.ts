import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as dns from 'node:dns';
import * as net from 'node:net';
import * as express from 'express';
import { AppModule } from './app.module';

dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    cors: false,
    // bodyParser désactivé ici pour le configurer manuellement (body raw pour les webhooks)
    bodyParser: false,
  });

  const config = app.get(ConfigService);

  app.use(helmet());

  // ── Corps brut pour les webhooks agrégateurs (vérification HMAC) ──
  // Les routes /webhooks/* reçoivent le corps en Buffer pour vérifier la signature avant parsing.
  app.use('/v1/webhooks', express.raw({ type: '*/*', limit: '10mb' }), (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as Record<string, unknown>).rawBody = req.body;
    next();
  });

  // ── JSON pour toutes les autres routes ──
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // ── CORS ──
  const origines = config.get<string[]>('corsOrigins') ?? [];
  const motifs = origines.map((o) =>
    o.includes('*')
      ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\*]/g, '\\$&').replace(/\\\*/g, '[a-z0-9-]+')}$`, 'i')
      : o,
  );
  app.enableCors({
    origin: origines.length
      ? (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) =>
          cb(null, !origin || motifs.some((m) => (typeof m === 'string' ? m === origin : m.test(origin))))
      : false,
    credentials: true,
  });

  const apiPrefix = config.get<string>('apiPrefix') ?? 'v1';
  app.setGlobalPrefix(apiPrefix, { exclude: ['sante', 'paiement/verif/:code'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const port = config.get<number>('port')!;
  await app.listen(port, '0.0.0.0');
  logger.log(`api-paiement démarré sur le port ${port} (env: ${config.get<string>('nodeEnv')})`);
}

bootstrap();
