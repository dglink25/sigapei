import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Base } from './common/base/base.service';
import { RabbitMqPublisher } from './common/evenements/rabbitmq.publisher';
import { AuthentificationGuard } from './common/guards/authentification.guard';
import { LimiteDebitGuard } from './common/guards/limite-debit.guard';
import { HttpInterneService } from './common/http/http-interne.service';
import configuration from './config/configuration';
import { DemandesController, DocumentsController } from './demandes/demandes.controller';
import { DemandesService } from './demandes/demandes.service';
import { EligibiliteService } from './demandes/eligibilite.service';
import { DocumentsService } from './generation/documents.service';
import { GouvernanceController } from './gouvernance/gouvernance.controller';
import { GouvernanceService } from './gouvernance/gouvernance.service';
import { EtablissementsClient } from './integrations/etablissements.client';
import { EvaluationsClient } from './integrations/evaluations.client';
import { FinancesClient } from './integrations/finances.client';
import { IdentiteClient } from './integrations/identite.client';
import { RhClient } from './integrations/rh.client';
import { ScolariteClient } from './integrations/scolarite.client';
import { InterneController } from './interne/interne.controller';
import { PermissionsAbsenceController } from './permissions-absence/permissions-absence.controller';
import { PermissionsAbsenceService } from './permissions-absence/permissions-absence.service';
import { ReclamationsController } from './reclamations/reclamations.controller';
import { ReclamationsService } from './reclamations/reclamations.service';
import { SanteController } from './sante.controller';
import { StatistiquesController } from './statistiques/statistiques.controller';
import { TypesDocumentController } from './types-document/types-document.controller';
import { TypesDocumentService } from './types-document/types-document.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Limitation de debit par defaut : 120 requetes / minute ; plus stricte sur les creations (@Throttle).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('db.host'),
        port: config.get('db.port'),
        username: config.get('db.username'),
        password: config.get('db.password'),
        database: config.get('db.database'),
        schema: config.get('db.schema'),
        // Jamais de synchronisation automatique : le schema est decrit par les migrations (Regle n°1).
        synchronize: false,
        // Neon presente un certificat valide : verification obligatoire.
        ssl: config.get('db.ssl') ? { rejectUnauthorized: true } : false,
        entities: [],
        migrations: [__dirname + '/database/migrations/*.{js,ts}'],
        migrationsRun: false,
        logging: ['error'],
      }),
    }),
  ],
  controllers: [
    SanteController,
    TypesDocumentController,
    DemandesController,
    DocumentsController,
    PermissionsAbsenceController,
    ReclamationsController,
    GouvernanceController,
    StatistiquesController,
    InterneController,
  ],
  providers: [
    Base,
    HttpInterneService,
    IdentiteClient,
    EtablissementsClient,
    ScolariteClient,
    RhClient,
    EvaluationsClient,
    FinancesClient,
    RabbitMqPublisher,
    GouvernanceService,
    TypesDocumentService,
    EligibiliteService,
    DocumentsService,
    DemandesService,
    PermissionsAbsenceService,
    ReclamationsService,
    // Ordre : authentification (jeton Identite ou contexte Gateway), puis limitation de debit par utilisateur.
    { provide: APP_GUARD, useClass: AuthentificationGuard },
    { provide: APP_GUARD, useClass: LimiteDebitGuard },
  ],
})
export class AppModule {}
