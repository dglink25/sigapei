import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.entity';
import { IdentifiantRecuperation } from './identifiant-recuperation.entity';
import { QuestionSecurite } from './question-securite.entity';
import { UtilisateursService } from './utilisateurs.service';
import { MoiController } from './moi.controller';
import { BiometrieModule } from '../biometrie/biometrie.module';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, IdentifiantRecuperation, QuestionSecurite]),
    BiometrieModule,
    OtpModule,
  ],
  controllers: [MoiController],
  providers: [UtilisateursService],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
