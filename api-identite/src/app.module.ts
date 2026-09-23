import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { RolesModule } from './roles/roles.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { OtpModule } from './otp/otp.module';
import { JetonsModule } from './jetons/jetons.module';
import { AuthModule } from './auth/auth.module';
import { BiometrieModule } from './biometrie/biometrie.module';
import { RecuperationModule } from './recuperation/recuperation.module';
import { AppareilsModule } from './appareils/appareils.module';
import { AuditModule } from './audit/audit.module';
import { InterneModule } from './interne/interne.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SanteController } from './sante.controller';

import { Role } from './roles/role.entity';
import { Utilisateur } from './utilisateurs/utilisateur.entity';
import { IdentifiantRecuperation } from './utilisateurs/identifiant-recuperation.entity';
import { QuestionSecurite } from './utilisateurs/question-securite.entity';
import { Appareil } from './appareils/appareil.entity';
import { EmpreinteBiometrique } from './biometrie/empreinte-biometrique.entity';
import { TentativeConnexion } from './audit/tentative-connexion.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
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
        synchronize: config.get('db.synchronize'),
        ssl: config.get('db.ssl') ? { rejectUnauthorized: false } : false,
        entities: [Role, Utilisateur, IdentifiantRecuperation, QuestionSecurite, Appareil, EmpreinteBiometrique, TentativeConnexion],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        namingStrategy: undefined,
        logging: config.get('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    RedisModule,
    RabbitmqModule,
    IntegrationsModule,
    RolesModule,
    UtilisateursModule,
    OtpModule,
    JetonsModule,
    AuthModule,
    BiometrieModule,
    RecuperationModule,
    AppareilsModule,
    AuditModule,
    InterneModule,
  ],
  controllers: [SanteController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
