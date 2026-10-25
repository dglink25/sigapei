import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.entity';
import { IdentifiantRecuperation } from './identifiant-recuperation.entity';
import { QuestionSecurite } from './question-securite.entity';
import { UtilisateursService } from './utilisateurs.service';
import { GestionUtilisateursService } from './gestion-utilisateurs.service';
import { MoiController } from './moi.controller';
import { GestionUtilisateursController } from './gestion-utilisateurs.controller';
import { BiometrieModule } from '../biometrie/biometrie.module';
import { OtpModule } from '../otp/otp.module';
import { Role } from '../roles/role.entity';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, IdentifiantRecuperation, QuestionSecurite, Role]),
    BiometrieModule,
    OtpModule,
    RabbitmqModule,
  ],
  controllers: [MoiController, GestionUtilisateursController],
  providers: [UtilisateursService, GestionUtilisateursService],
  exports: [UtilisateursService, GestionUtilisateursService],
})
export class UtilisateursModule {}
