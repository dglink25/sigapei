import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtablissementService } from './etablissement-service.entity';
import { Service } from '../services/service.entity';
import { UtilisateurServiceEtablissement } from '../acces-services/utilisateur-service-etablissement.entity';
import { ServicesEtablissementsService } from './services-etablissements.service';
import { ServicesEtablissementsController } from './services-etablissements.controller';
import { EtablissementsRefModule } from '../etablissements-ref/etablissements-ref.module';
import { AccesCacheModule } from '../acces-services/acces-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtablissementService, Service, UtilisateurServiceEtablissement]),
    EtablissementsRefModule,
    AccesCacheModule,
  ],
  controllers: [ServicesEtablissementsController],
  providers: [ServicesEtablissementsService],
})
export class ServicesEtablissementsModule {}
