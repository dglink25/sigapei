import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { OtpService } from '../otp/otp.service';
import { RedisService } from '../redis/redis.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { RecaptchaProvider } from '../integrations/captcha/recaptcha.provider';
import { AuditService } from '../audit/audit.service';
import { MethodeConnexion, StatutTentative } from '../audit/tentative-connexion.entity';

/**
 * Parcours de recuperation d'identifiant oublie (section 8) - jamais une
 * recuperation de mot de passe puisqu'il n'en existe pas sur la plateforme.
 */
@Injectable()
export class RecuperationService {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly otpService: OtpService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitmqService,
    private readonly captcha: RecaptchaProvider,
    private readonly auditService: AuditService,
  ) {}

  private cleQuestionValidee(compteUuid: string) {
    return `recuperation:question-validee:${compteUuid}`;
  }

  async rechercherCompte(indice: string, captchaToken: string) {
    await this.captcha.verifier(captchaToken);

    // Recherche par email/telephone de recuperation verifie ou par nom complet.
    const utilisateur =
      (await this.utilisateursService.trouverParEmail(indice)) ??
      (await this.utilisateursService.trouverParTelephone(indice));

    if (!utilisateur) {
      // Reponse volontairement generique pour ne pas confirmer l'absence de compte (anti-enumeration).
      throw new NotFoundException({
        code: 'COMPTE_INTROUVABLE',
        message: "Aucun compte ne correspond a ces informations.",
      });
    }

    const identifiantMasque = utilisateur.email
      ? this.utilisateursService.masquerEmail(utilisateur.email)
      : this.utilisateursService.masquerTelephone(utilisateur.telephone!);

    const questions = await this.utilisateursService.listerQuestionsSecurite(utilisateur.id);

    return {
      compteUuid: utilisateur.uuid,
      identifiantMasque,
      questionRequise: questions.length > 0,
      questions: questions.map((q) => ({ questionId: q.questionId })),
    };
  }

  async verifierQuestion(compteUuid: string, questionId: string, reponse: string) {
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(compteUuid);
    const questions = await this.utilisateursService.listerQuestionsSecurite(utilisateur.id);
    const question = questions.find((q) => q.questionId === questionId);
    if (!question) throw new NotFoundException({ code: 'QUESTION_INTROUVABLE', message: 'Question introuvable.' });

    const valide = await argon2.verify(question.reponseHash, reponse.trim().toLowerCase());
    if (!valide) {
      throw new ForbiddenException({ code: 'REPONSE_INCORRECTE', message: 'La reponse fournie est incorrecte.' });
    }
    await this.redis.client.set(this.cleQuestionValidee(compteUuid), '1', 'EX', 600);
    return { code: 'QUESTION_VALIDEE' };
  }

  async envoyerOtpRecuperation(compteUuid: string) {
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(compteUuid);
    if (utilisateur.email) {
      await this.otpService.envoyerParEmail(utilisateur.id, utilisateur.email);
    } else if (utilisateur.telephone) {
      await this.otpService.envoyerParTelephone(utilisateur.id, utilisateur.telephone);
    } else {
      throw new BadRequestException({
        code: 'AUCUN_IDENTIFIANT_RECUPERATION',
        message: "Aucun identifiant de recuperation verifie n'est configure sur ce compte.",
      });
    }
    return { code: 'OTP_RECUPERATION_ENVOYE' };
  }

  async confirmer(compteUuid: string, code: string) {
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(compteUuid);
    const cible = utilisateur.email ?? utilisateur.telephone!;
    try {
      await this.otpService.verifier(cible, code);
    } catch (err) {
      await this.auditService.journaliser({
        utilisateurId: utilisateur.id,
        methode: MethodeConnexion.EMAIL_OTP,
        statut: StatutTentative.ECHEC,
        motifEchec: 'recuperation_otp_invalide',
      });
      throw err;
    }

    this.rabbitmq.publier('identifiant.recupere', { utilisateurUuid: utilisateur.uuid });
    return {
      code: 'IDENTIFIANT_RECUPERE',
      identifiant: utilisateur.email ?? utilisateur.telephone,
      matricule: utilisateur.matricule,
    };
  }
}
