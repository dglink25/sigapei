import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    // Jamais d'origine joker : liste explicite obligatoire (CORS_ORIGINS).
    origin: config.get<string[]>('corsOrigins') ?? [],
    credentials: true,
  });

  const prefix = config.get<string>('apiPrefix') ?? 'v1';
  // La sonde /sante est hors prefixe (CDC convention plateforme)
  app.setGlobalPrefix(prefix, { exclude: ['sante', 'docs', 'docs-json'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Documentation interactive desactivee en production sauf activation explicite.
  const swaggerActif =
    config.get<string>('nodeEnv') !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerActif) {
  const swaggerDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API Demandes administratives - SIGAPEI')
      .setDescription(
        'Guichet unique de demandes de documents, permissions d\'absence et reclamations.',
      )
      .setVersion('1.0.0')
      .addTag('Demandes administratives')
      .addTag("Permissions d'absence")
      .addTag('Reclamations')
      .addTag('Types de document')
      .build(),
  );
  SwaggerModule.setup('docs', app, swaggerDoc, {
    customSiteTitle: 'API Demandes - Documentation',
    swaggerOptions: { persistAuthorization: true },
  });
  }

  const port = config.get<number>('port') ?? 4007;
  await app.listen(port, '0.0.0.0');
  logger.log(
    `api-demandes demarre sur le port ${port} (prefixe: /${prefix}, docs: /docs)`,
  );
}

bootstrap();
