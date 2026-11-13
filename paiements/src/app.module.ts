import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { SecuriteModule } from './common/securite/securite.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LivreModule } from './livre/livre.module';
import { AuditModule } from './audit/audit.module';
import { SanteController } from './sante/sante.controller';
import { AgregateurModule } from './agregateurs/agregateurs.module';
import { EncaissementModule } from './encaissements/encaissement.module';
import { DecaissementModule } from './decaissements/decaissement.module';
import { RecuModule } from './recus/recu.module';
import { NotificationModule } from './notifications/notification.module';
import { TachesModule } from './taches/taches.module';
import { AdministrationModule } from './administration/administration.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.database'),
        schema: config.get<string>('db.schema'),
        synchronize: false,
        ssl: config.get<boolean>('db.ssl') ? { rejectUnauthorized: false } : false,
        entities: [],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    ScheduleModule.forRoot(),
    SecuriteModule,  // global - ChiffrementService
    AuditModule,     // global - AuditService
    LivreModule,
    AgregateurModule,
    EncaissementModule,
    DecaissementModule,
    RecuModule,
    NotificationModule,
    TachesModule,
    AdministrationModule,
  ],
  controllers: [SanteController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
