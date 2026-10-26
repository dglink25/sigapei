import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.entity';
import { IdentifiantRecuperation } from './identifiant-recuperation.entity';
import { QuestionSecurite } from './question-securite.entity';
import { Role } from '../roles/role.entity';
import { UtilisateursService } from './utilisateurs.service';
import { GestionUtilisateursService } from './gestion-utilisateurs.service';
import { GestionUtilisateursController } from './gestion-utilisateurs.controller';
import { MoiController } from './moi.controller';
import { BiometrieModule } from '../biometrie/biometrie.module';
import { OtpModule } from '../otp/otp.module';
import { EtablissementsRefModule } from '../etablissements-ref/etablissements-ref.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, IdentifiantRecuperation, QuestionSecurite, Role]),
    BiometrieModule,
    OtpModule,
    EtablissementsRefModule,
    RabbitmqModule,
  ],
  controllers: [MoiController, GestionUtilisateursController],
  providers: [UtilisateursService, GestionUtilisateursService],
  exports: [UtilisateursService, GestionUtilisateursService],
})
export class UtilisateursModule {}
