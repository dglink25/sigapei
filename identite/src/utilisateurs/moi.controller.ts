import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as argon2 from 'argon2';
import { UtilisateursService } from './utilisateurs.service';
import { BiometrieService } from '../biometrie/biometrie.service';
import { OtpService } from '../otp/otp.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AjouterIdentifiantRecuperationDto } from './dto/ajouter-identifiant-recuperation.dto';
import { ConfigurerQuestionsSecuriteDto } from './dto/configurer-questions-securite.dto';
import { ModifierProfilDto } from './dto/modifier-profil.dto';
import {
  ConfirmerChangementEmailDto,
  ConfirmerChangementTelephoneDto,
  DemanderChangementEmailDto,
  DemanderChangementTelephoneDto,
  SupprimerEmpreinteDto,
  VerifierIdentifiantRecuperationDto,
} from './dto/changer-contact.dto';
import { normaliserTelephoneE164 } from '../common/utils/phone.util';

@ApiTags('Mon profil')
@ApiBearerAuth()
@Controller('moi')
export class MoiController {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly biometrieService: BiometrieService,
    private readonly otpService: OtpService,
  ) {}

  /* ══════════════════════════════════════════════════════
     PROFIL
  ══════════════════════════════════════════════════════ */

  @Get()
  @ApiOperation({ summary: "Retourne le profil complet de l'utilisateur authentifié." })
  async profil(@CurrentUser('sub') uuid: string) {
    const u = await this.utilisateursService.trouverParUuidOuEchouer(uuid);
    return {
      uuid:        u.uuid,
      nomComplet:  u.nomComplet,
      email:       u.email,
      telephone:   u.telephone,
      matricule:   u.matricule,
      role:        u.role.code,
      familleAuth: u.role.familleAuth,
      tenantId:    u.tenantId,
      statut:      u.statut,
      photoUrl:    u.photoUrl,
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier nom complet et/ou photo de profil.' })
  async modifierProfil(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: ModifierProfilDto,
  ) {
    await this.utilisateursService.modifierProfil(utilisateurId, dto);
    return { code: 'PROFIL_MIS_A_JOUR' };
  }

  /* ══════════════════════════════════════════════════════
     CHANGER E-MAIL  (OTP obligatoire)
  ══════════════════════════════════════════════════════ */

  @Post('email/changer')
  @ApiOperation({ summary: "Demande de changement d'e-mail : envoie un OTP sur le nouvel e-mail." })
  async demanderChangementEmail(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @CurrentUser('sub') uuid: string,
    @Body() dto: DemanderChangementEmailDto,
  ) {
    const existe = await this.utilisateursService.trouverParEmail(dto.nouvelEmail.toLowerCase());
    if (existe && existe.id !== utilisateurId) {
      throw new ConflictException({ code: 'EMAIL_DEJA_UTILISE', message: 'Cette adresse e-mail est déjà associée à un autre compte.' });
    }
    await this.otpService.envoyerParEmail(utilisateurId, dto.nouvelEmail.toLowerCase());
    return { code: 'OTP_ENVOYE', canal: 'email', cible: this.utilisateursService.masquerEmail(dto.nouvelEmail) };
  }

  @Post('email/confirmer')
  @ApiOperation({ summary: "Confirme le changement d'e-mail après validation OTP." })
  async confirmerChangementEmail(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: ConfirmerChangementEmailDto,
  ) {
    const nouvelEmailNorm = dto.nouvelEmail.toLowerCase();
    await this.otpService.verifier(nouvelEmailNorm, dto.code);
    await this.utilisateursService.changerEmail(utilisateurId, nouvelEmailNorm);
    return { code: 'EMAIL_MODIFIE' };
  }

  /* ══════════════════════════════════════════════════════
     CHANGER TÉLÉPHONE  (OTP obligatoire)
  ══════════════════════════════════════════════════════ */

  @Post('telephone/changer')
  @ApiOperation({ summary: 'Demande de changement de téléphone : envoie un OTP sur le nouveau numéro.' })
  async demanderChangementTelephone(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: DemanderChangementTelephoneDto,
  ) {
    let e164: string;
    try {
      e164 = normaliserTelephoneE164(dto.nouveauTelephone).e164;
    } catch {
      throw new BadRequestException({ code: 'TELEPHONE_INVALIDE', message: 'Numéro de téléphone invalide.' });
    }
    const existe = await this.utilisateursService.trouverParTelephone(e164);
    if (existe && existe.id !== utilisateurId) {
      throw new ConflictException({ code: 'TELEPHONE_DEJA_UTILISE', message: 'Ce numéro est déjà associé à un autre compte.' });
    }
    await this.otpService.envoyerParTelephone(utilisateurId, e164);
    return { code: 'OTP_ENVOYE', canal: 'sms+whatsapp', cible: this.utilisateursService.masquerTelephone(e164) };
  }

  @Post('telephone/confirmer')
  @ApiOperation({ summary: 'Confirme le changement de téléphone après validation OTP.' })
  async confirmerChangementTelephone(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: ConfirmerChangementTelephoneDto,
  ) {
    let e164: string;
    try {
      e164 = normaliserTelephoneE164(dto.nouveauTelephone).e164;
    } catch {
      throw new BadRequestException({ code: 'TELEPHONE_INVALIDE', message: 'Numéro de téléphone invalide.' });
    }
    await this.otpService.verifier(e164, dto.code);
    await this.utilisateursService.changerTelephone(utilisateurId, e164);
    return { code: 'TELEPHONE_MODIFIE' };
  }

  /* ══════════════════════════════════════════════════════
     IDENTIFIANTS DE RÉCUPÉRATION  (OTP obligatoire)
  ══════════════════════════════════════════════════════ */

  @Get('identifiants-recuperation')
  @ApiOperation({ summary: 'Liste les identifiants de récupération.' })
  listerIdentifiants(@CurrentUser('utilisateurId') utilisateurId: string) {
    return this.utilisateursService.listerIdentifiantsRecuperation(utilisateurId);
  }

  @Post('identifiants-recuperation')
  @ApiOperation({ summary: "Ajoute un identifiant de récupération et envoie un OTP de vérification." })
  async ajouterIdentifiant(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: AjouterIdentifiantRecuperationDto,
  ) {
    const entite = await this.utilisateursService.ajouterIdentifiantRecuperation(utilisateurId, dto.type, dto.valeur);
    // Envoyer OTP selon le canal
    if (dto.type === 'email') {
      await this.otpService.envoyerParEmail(utilisateurId, dto.valeur.toLowerCase());
    } else {
      let e164: string;
      try { e164 = normaliserTelephoneE164(dto.valeur).e164; } catch {
        throw new BadRequestException({ code: 'TELEPHONE_INVALIDE', message: 'Numéro invalide.' });
      }
      await this.otpService.envoyerParTelephone(utilisateurId, e164);
    }
    return { id: entite.id, code: 'OTP_ENVOYE_POUR_VERIFICATION' };
  }

  @Post('identifiants-recuperation/:id/verifier')
  @ApiOperation({ summary: 'Valide le code OTP pour marquer un identifiant de récupération comme vérifié.' })
  async verifierIdentifiant(
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Param('id') id: string,
    @Body() dto: VerifierIdentifiantRecuperationDto,
  ) {
    const identifiants = await this.utilisateursService.listerIdentifiantsRecuperation(utilisateurId);
    const cible = identifiants.find((i: any) => i.id === id);
    if (!cible) throw new BadRequestException({ code: 'IDENTIFIANT_INTROUVABLE', message: 'Identifiant introuvable.' });
    await this.otpService.verifier(cible.valeur, dto.code);
    await this.utilisateursService.verifierIdentifiantRecuperation(id);
    return { code: 'IDENTIFIANT_VERIFIE' };
  }

  /* ══════════════════════════════════════════════════════
     EMPREINTES BIOMÉTRIQUES  (plusieurs par compte)
  ══════════════════════════════════════════════════════ */

  @Get('empreintes')
  @ApiOperation({ summary: 'Liste toutes les empreintes actives du compte.' })
  async listerEmpreintes(@CurrentUser('utilisateurId') utilisateurId: string) {
    return this.biometrieService.listerParUtilisateur(utilisateurId);
  }

  @Post('empreintes/enregistrement/options')
  @ApiOperation({ summary: "Génère les options WebAuthn pour enregistrer une nouvelle empreinte." })
  async optionsEnregistrement(
    @CurrentUser('sub') uuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
  ) {
    const u = await this.utilisateursService.trouverParUuidOuEchouer(uuid);
    return this.biometrieService.genererOptionsEnregistrement(uuid, utilisateurId, u.nomComplet ?? uuid);
  }

  @Post('empreintes/enregistrement/verifier')
  @ApiOperation({ summary: 'Enregistre une nouvelle empreinte après vérification WebAuthn.' })
  async verifierEnregistrement(
    @CurrentUser('sub') uuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() body: { identifiantLocal: string; reponse: any },
  ) {
    const appareil = await this.biometrieService['appareilRepo'].findOne({
      where: { identifiantLocal: body.identifiantLocal, utilisateurId },
    });
    if (!appareil) throw new BadRequestException({ code: 'APPAREIL_INTROUVABLE', message: 'Appareil non reconnu.' });
    const empreinte = await this.biometrieService.verifierEtEnregistrer(uuid, utilisateurId, appareil.id, body.reponse);
    return { uuid: empreinte.credentialId, code: 'EMPREINTE_ENREGISTREE' };
  }

  @Delete('empreintes/:credentialId')
  @ApiOperation({ summary: "Révoque une empreinte biométrique. Un OTP est requis pour confirmer l'identité." })
  async supprimerEmpreinte(
    @CurrentUser('sub') uuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Param('credentialId') credentialId: string,
    @Body() dto: SupprimerEmpreinteDto,
  ) {
    // Charger le canal principal de l'utilisateur depuis la DB
    const u = await this.utilisateursService.trouverParUuidOuEchouer(uuid);
    const cible = u.telephone ?? u.email;
    if (!cible) throw new BadRequestException({ code: 'AUCUN_CANAL_DISPONIBLE', message: 'Aucun canal de vérification disponible.' });
    await this.otpService.verifier(cible, dto.code);
    await this.biometrieService.revoquer(credentialId, utilisateurId);
    return { code: 'EMPREINTE_REVOQUEE' };
  }

  /* ══════════════════════════════════════════════════════
     QUESTIONS DE SÉCURITÉ
  ══════════════════════════════════════════════════════ */

  @Get('appareils')
  @ApiOperation({ summary: 'Liste les appareils connectés.' })
  appareils(@CurrentUser('utilisateurId') utilisateurId: string) {
    return [];
  }

  @Put('questions-securite')
  @ApiOperation({ summary: 'Configure ou met à jour les questions de sécurité.' })
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
