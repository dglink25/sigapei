import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as argon2 from 'argon2';
import { UtilisateursService } from './utilisateurs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AjouterIdentifiantRecuperationDto } from './dto/ajouter-identifiant-recuperation.dto';
import { ConfigurerQuestionsSecuriteDto } from './dto/configurer-questions-securite.dto';

@ApiTags('Mon profil')
@ApiBearerAuth()
@Controller('moi')
export class MoiController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Get()
  @ApiOperation({ summary: "Retourne le profil de l'utilisateur authentifie (a partir du JWT), y compris son role." })
  async profil(@CurrentUser('sub') uuid: string) {
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(uuid);
    return {
      uuid: utilisateur.uuid,
      nomComplet: utilisateur.nomComplet,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      matricule: utilisateur.matricule,
      role: utilisateur.role.code,
      familleAuth: utilisateur.role.familleAuth,
      tenantId: utilisateur.tenantId,
      statut: utilisateur.statut,
      photoUrl: utilisateur.photoUrl,
    };
  }

  @Post('identifiants-recuperation')
  @ApiOperation({ summary: "Ajoute un e-mail ou telephone de secours (verification OTP a prevoir cote client)." })
  async ajouterIdentifiant(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: AjouterIdentifiantRecuperationDto,
  ) {
    return this.utilisateursService.ajouterIdentifiantRecuperation(utilisateurId, dto.type, dto.valeur);
  }

  @Get('identifiants-recuperation')
  @ApiOperation({ summary: "Liste les identifiants de recuperation configures." })
  listerIdentifiants(@CurrentUser('utilisateurId') utilisateurId: string) {
    return this.utilisateursService.listerIdentifiantsRecuperation(utilisateurId);
  }

  @Put('questions-securite')
  @ApiOperation({ summary: 'Configure ou met a jour les questions de securite (reponses hachees).' })
  async configurerQuestions(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: ConfigurerQuestionsSecuriteDto,
  ) {
    for (const q of dto.questions) {
      const hash = await argon2.hash(q.reponse.trim().toLowerCase());
      await this.utilisateursService.enregistrerQuestionSecurite(utilisateurId, q.questionId, hash);
    }
    return { code: 'QUESTIONS_SECURITE_ENREGISTREES' };
  }
}
