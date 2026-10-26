import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { UtilisateurServiceEtablissement } from './utilisateur-service-etablissement.entity';
import { AccesServicesService } from './acces-services.service';
import { AccesServicesController } from './acces-services.controller';
import { MoiServicesController } from './moi-services.controller';
import { MoiPortailController } from './moi-portail.controller';
import { InterneAccesController } from './interne-acces.controller';
import { AccesRpcController } from './acces-rpc.controller';
import { InternalSecretSafeGuard } from './internal-secret-safe.guard';
import { AccesCacheModule } from './acces-cache.module';
import { EtablissementsRefModule } from '../etablissements-ref/etablissements-ref.module';
import { PermissionsRoleService } from './permissions-role.service';
import { PermissionsRoleController } from './permissions-role.controller';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, UtilisateurServiceEtablissement]),
    EtablissementsRefModule,
    AccesCacheModule,
    RabbitmqModule,
  ],
  controllers: [AccesServicesController, MoiServicesController, MoiPortailController, InterneAccesController, AccesRpcController, PermissionsRoleController],
  providers: [AccesServicesService, InternalSecretSafeGuard, PermissionsRoleService],
  exports: [AccesServicesService, PermissionsRoleService],
})
export class AccesServicesModule {}
