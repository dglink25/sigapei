import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.entity';
import { IdentifiantRecuperation } from './identifiant-recuperation.entity';
import { QuestionSecurite } from './question-securite.entity';
import { UtilisateursService } from './utilisateurs.service';
import { MoiController } from './moi.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, IdentifiantRecuperation, QuestionSecurite])],
  controllers: [MoiController],
  providers: [UtilisateursService],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
