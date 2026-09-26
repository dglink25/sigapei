import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { seedRolesSysteme } from './roles/roles.seed';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  // --- Securite HTTP de base ---
  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins')?.length ? config.get<string[]>('corsOrigins') : true,
    credentials: true,
  });

  // --- Prefixe global + validation stricte des DTO ---
  const prefix = config.get<string>('apiPrefix')!;
  app.setGlobalPrefix(prefix, { exclude: ['sante', 'docs', 'docs-json'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- Documentation Swagger : route /docs (voir aussi /docs-json pour le JSON brut) ---
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API Identite (SSO) - sigapei')
      .setDescription(
        "Documentation complete du microservice Identite : authentification sans mot de passe " +
          "(matricule+empreinte, telephone+OTP, e-mail+OTP, Google, GitHub), gestion des roles dynamiques, " +
          "appareils/sessions, recuperation d'identifiant. Toutes les routes, leur format de requete et de " +
          "reponse sont documentes ci-dessous.",
      )
      .setVersion('2.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Authentification')
      .addTag('Roles')
      .addTag('Mon profil')
      .addTag('Appareils & sessions')
      .addTag('Recuperation identifiant')
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'API Identite - Documentation',
    swaggerOptions: { persistAuthorization: true },
  });

  // --- Microservice RabbitMQ (canal RPC "identite.rpc" pour les autres microservices) ---
  const rabbitmqUrl = config.get<string>('rabbitmq.url');
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: config.get<string>('rabbitmq.queueIdentite'),
        queueOptions: { durable: true },
      },
    });
    await app.startAllMicroservices();
    logger.log('Microservice RabbitMQ (RPC) demarre');
  }

  // --- Seed des 6 roles systeme au demarrage ---
  try {
    const dataSource = app.get(DataSource);
    await seedRolesSysteme(dataSource);
    logger.log('Roles systeme verifies/charges');
  } catch (err) {
    logger.warn(`Seed des roles impossible pour le moment: ${(err as Error).message}`);
  }

  const port = config.get<number>('port')!;
  await app.listen(port, '0.0.0.0');
  logger.log(`api-identite demarre sur le port ${port} (prefixe API: /${prefix}, documentation: /docs)`);
}

bootstrap();
