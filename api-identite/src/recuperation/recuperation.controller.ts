import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecuperationService } from './recuperation.service';
import { RechercherCompteDto } from './dto/rechercher-compte.dto';
import { VerifierQuestionDto } from './dto/verifier-question.dto';
import { EnvoyerOtpRecuperationDto } from './dto/envoyer-otp-recuperation.dto';
import { ConfirmerRecuperationDto } from './dto/confirmer-recuperation.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Recuperation identifiant')
@Public()
@Controller('recuperation')
export class RecuperationController {
  constructor(private readonly recuperationService: RecuperationService) {}

  @Post('rechercher-compte')
  @ApiOperation({ summary: 'Recherche un compte a partir d\'informations partielles (apres CAPTCHA).' })
  rechercherCompte(@Body() dto: RechercherCompteDto) {
    return this.recuperationService.rechercherCompte(dto.indice, dto.captchaToken);
  }

  @Post('verifier-question')
  @ApiOperation({ summary: 'Verifie la reponse a une question de securite.' })
  verifierQuestion(@Body() dto: VerifierQuestionDto) {
    return this.recuperationService.verifierQuestion(dto.compteUuid, dto.questionId, dto.reponse);
  }

  @Post('envoyer-otp')
  @ApiOperation({ summary: "Envoie un OTP vers l'identifiant de recuperation verifie." })
  envoyerOtp(@Body() dto: EnvoyerOtpRecuperationDto) {
    return this.recuperationService.envoyerOtpRecuperation(dto.compteUuid);
  }

  @Post('confirmer')
  @ApiOperation({ summary: "Revele l'identifiant de connexion apres validation de l'OTP." })
  confirmer(@Body() dto: ConfirmerRecuperationDto) {
    return this.recuperationService.confirmer(dto.compteUuid, dto.code);
  }
}
