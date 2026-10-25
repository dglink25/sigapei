import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { DemandesRoleService } from './demandes-role.service';
import { DemandesRoleController } from './demandes-role.controller';
import { EtablissementsRefModule } from '../etablissements-ref/etablissements-ref.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Utilisateur]),
    EtablissementsRefModule,
    RabbitmqModule,
  ],
  controllers: [RolesController, DemandesRoleController],
  providers: [RolesService, DemandesRoleService],
  exports: [RolesService, DemandesRoleService],
})
export class RolesModule {}
