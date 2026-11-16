import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configurerApplication } from './common/application';

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

  configurerApplication(app);

  // --- Documentation Swagger (même convention qu'Identité) : /docs, JSON brut sur /docs-json ---
  const swaggerDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API Demandes administratives - SIGAPEI')
      .setDescription(
        "Guichet unique : demandes de documents (tout profil), permissions d'absence, reclamations. " +
          'Acces : Authorization: Bearer <jeton Identite> (verifie par Identite) ou contexte Gateway avec X-Internal-Secret. ' +
          "Les actions de gestion dependent de la grille role x action de l'etablissement (/gouvernance).",
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('Demandes administratives')
      .addTag("Permissions d'absence")
      .addTag('Reclamations')
      .addTag('Types de document')
      .addTag('Gouvernance du module')
      .addTag('Statistiques')
      .addTag('Interne')
      .build(),
  );
  SwaggerModule.setup('docs', app, swaggerDoc, {
    customSiteTitle: 'API Demandes - Documentation',
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port') ?? 4007;
  await app.listen(port, '0.0.0.0');
  logger.log(`api-demandes demarre sur le port ${port} (prefixe: /${prefix}, docs: /docs)`);
}

bootstrap();
