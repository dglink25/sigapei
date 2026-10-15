import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ContexteGatewayGuard } from './common/guards/contexte-gateway.guard';
import configuration from './config/configuration';
import { SanteController } from './sante.controller';
import { DemandesController } from './demandes/demandes.controller';
import { PermissionsAbsenceController } from './permissions-absence/permissions-absence.controller';
import { ReclamationsController } from './reclamations/reclamations.controller';
import { TypesDocumentController } from './types-document/types-document.controller';
import { InterneController } from './interne/interne.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Rate limiting : 120 requetes / minute / IP (meme regle que api-identite)
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
        // Jamais de synchronisation automatique hors developpement local (README, Regle n°1).
        synchronize: config.get('nodeEnv') === 'development' && config.get('db.synchronize') === true,
        // Neon presente un certificat valide : verification obligatoire (pas de MITM possible).
        ssl: config.get('db.ssl') ? { rejectUnauthorized: true } : false,
        // Entites enregistrees au fur et a mesure du developpement
        entities: [],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        logging: config.get('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
  controllers: [
    SanteController,
    DemandesController,
    PermissionsAbsenceController,
    ReclamationsController,
    TypesDocumentController,
    InterneController,
  ],
  providers: [
    // Ordre : limitation de debit, puis contexte Gateway obligatoire sur toute route metier.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ContexteGatewayGuard },
  ],
})
export class AppModule {}
