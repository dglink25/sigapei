import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { OtpService } from '../otp/otp.service';
import { JwtEmissionService } from '../jetons/jwt.service';
import { SessionRedisService } from '../jetons/session.redis.service';
import { TokenBlacklistRedis } from '../jetons/token-blacklist.redis';
import { RecaptchaProvider } from '../integrations/captcha/recaptcha.provider';
import { FirebaseAdminProvider } from '../integrations/firebase/firebase-admin.provider';
import { AppareilsService } from '../appareils/appareils.service';
import { BiometrieService } from '../biometrie/biometrie.service';
import { AuditService } from '../audit/audit.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { MethodeConnexion, StatutTentative } from '../audit/tentative-connexion.entity';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { normaliserTelephoneE164 } from '../common/utils/phone.util';
import { dureeEnSecondes } from '../common/utils/duree.util';
import { AppareilInfoDto } from './dto/appareil-info.dto';

type MethodeIdentification = 'email_otp' | 'telephone_otp' | 'matricule_empreinte';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly utilisateursService: UtilisateursService,
    private readonly otpService: OtpService,
    private readonly jwtEmission: JwtEmissionService,
    private readonly sessions: SessionRedisService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly captcha: RecaptchaProvider,
    private readonly firebase: FirebaseAdminProvider,
    private readonly appareilsService: AppareilsService,
    private readonly biometrieService: BiometrieService,
    private readonly auditService: AuditService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  // ---------------------------------------------------------------------
  // POST /auth/identifier
  // ---------------------------------------------------------------------
  async identifier(identifiant: string): Promise<{ methode: MethodeIdentification; identifiantMasque: string }> {
    const utilisateur = await this.resoudreUtilisateur(identifiant);
    if (!utilisateur) {
      throw new NotFoundException({ code: 'IDENTIFIANT_INTROUVABLE', message: 'Aucun compte ne correspond a cet identifiant.' });
    }

    if (utilisateur.matricule === identifiant) {
      return { methode: 'matricule_empreinte', identifiantMasque: utilisateur.matricule! };
    }
    if (utilisateur.email === identifiant.toLowerCase()) {
      return { methode: 'email_otp', identifiantMasque: this.utilisateursService.masquerEmail(utilisateur.email!) };
    }
    return { methode: 'telephone_otp', identifiantMasque: this.utilisateursService.masquerTelephone(utilisateur.telephone!) };
  }

  private async resoudreUtilisateur(identifiant: string): Promise<Utilisateur | null> {
    if (identifiant.includes('@')) {
      return this.utilisateursService.trouverParEmail(identifiant.toLowerCase());
    }
    if (/^[+0-9\s-]+$/.test(identifiant)) {
      try {
        const { e164 } = normaliserTelephoneE164(identifiant);
        return this.utilisateursService.trouverParTelephone(e164);
      } catch {
        return null;
      }
    }
    return this.utilisateursService.trouverParMatricule(identifiant);
  }

  // ---------------------------------------------------------------------
  // POST /auth/otp/envoyer
  // ---------------------------------------------------------------------
  async envoyerOtp(identifiant: string, captchaToken: string) {
    await this.captcha.verifier(captchaToken);
    const utilisateur = await this.resoudreUtilisateur(identifiant);
    if (!utilisateur) {
      throw new NotFoundException({ code: 'IDENTIFIANT_INTROUVABLE', message: 'Aucun compte ne correspond a cet identifiant.' });
    }

    if (identifiant.includes('@')) {
      await this.otpService.envoyerParEmail(utilisateur.id, utilisateur.email!);
      return { code: 'OTP_ENVOYE', canal: 'email' };
    }
    const { e164 } = normaliserTelephoneE164(identifiant);
    const resultat = await this.otpService.envoyerParTelephone(utilisateur.id, e164);
    return { code: 'OTP_ENVOYE', canal: 'sms+whatsapp', ...resultat };
  }

  // ---------------------------------------------------------------------
  // POST /auth/otp/verifier
  // ---------------------------------------------------------------------
  async verifierOtp(identifiant: string, code: string, appareilInfo: AppareilInfoDto, ip?: string) {
    const utilisateur = await this.resoudreUtilisateur(identifiant);
    if (!utilisateur) {
      throw new NotFoundException({ code: 'IDENTIFIANT_INTROUVABLE', message: 'Aucun compte ne correspond a cet identifiant.' });
    }
    const cible = identifiant.includes('@') ? utilisateur.email! : normaliserTelephoneE164(identifiant).e164;
    const methode = identifiant.includes('@') ? MethodeConnexion.EMAIL_OTP : MethodeConnexion.TELEPHONE_OTP;

    try {
      await this.otpService.verifier(cible, code);
    } catch (err) {
      await this.auditService.journaliser({
        utilisateurId: utilisateur.id,
        methode,
        statut: StatutTentative.ECHEC,
        ip,
        motifEchec: (err as any)?.response?.code ?? 'otp_invalide',
      });
      throw err;
    }

    const session = await this.ouvrirSession(utilisateur, appareilInfo, ip);
    await this.auditService.journaliser({ utilisateurId: utilisateur.id, methode, statut: StatutTentative.SUCCES, ip });
    return session;
  }

  // ---------------------------------------------------------------------
  // POST /auth/firebase/verifier (Google / GitHub via Firebase)
  // ---------------------------------------------------------------------
  async connexionFirebase(idToken: string, appareilInfo: AppareilInfoDto, ip?: string) {
    const identite = await this.firebase.verifierJeton(idToken);
    if (!identite.email) {
      throw new BadRequestException({
        code: 'EMAIL_FIREBASE_ABSENT',
        message: "Le fournisseur n'a pas transmis d'adresse e-mail exploitable.",
      });
    }

    const utilisateur = await this.utilisateursService.trouverParEmail(identite.email.toLowerCase());
    const methode = identite.fournisseur === 'github.com' ? MethodeConnexion.GITHUB : MethodeConnexion.GOOGLE;

    if (!utilisateur) {
      await this.auditService.journaliser({
        methode,
        statut: StatutTentative.ECHEC,
        ip,
        motifEchec: 'compte_introuvable',
      });
      throw new NotFoundException({
        code: 'COMPTE_INTROUVABLE',
        message:
          "Aucun compte sigapei n'est associe a cette adresse e-mail. La connexion Google/GitHub ne cree pas de compte : celui-ci doit deja exister (voir principe 'pas d'inscription').",
      });
    }

    // Le fournisseur (Google/GitHub) a deja verifie l'identite : connexion systematique, sans OTP supplementaire.
    await this.utilisateursService.lierFirebaseUid(
      utilisateur,
      identite.fournisseur === 'github.com' ? 'github' : 'google',
      identite.uid,
    );

    const session = await this.ouvrirSession(utilisateur, appareilInfo, ip);
    await this.auditService.journaliser({ utilisateurId: utilisateur.id, methode, statut: StatutTentative.SUCCES, ip });
    return session;
  }

  // ---------------------------------------------------------------------
  // WebAuthn - matricule + empreinte
  // ---------------------------------------------------------------------
  async optionsConnexionMatricule(matricule: string, identifiantLocal: string) {
    const utilisateur = await this.utilisateursService.trouverParMatricule(matricule);
    if (!utilisateur) {
      throw new NotFoundException({ code: 'MATRICULE_INTROUVABLE', message: 'Aucun compte ne correspond a ce matricule.' });
    }
    const appareil = await this.appareilsService.trouverOuCreer(utilisateur.id, identifiantLocal);
    return this.biometrieService.genererOptionsConnexion(utilisateur.uuid, utilisateur.id).then((options) => ({
      options,
      appareilUuid: appareil.uuid,
    }));
  }

  async verifierConnexionMatricule(
    matricule: string,
    identifiantLocal: string,
    reponse: any,
    appareilInfo?: AppareilInfoDto,
    ip?: string,
  ) {
    const utilisateur = await this.utilisateursService.trouverParMatricule(matricule);
    if (!utilisateur) {
      throw new NotFoundException({ code: 'MATRICULE_INTROUVABLE', message: 'Aucun compte ne correspond a ce matricule.' });
    }
    const credentialId = reponse?.id;
    const verifie = await this.biometrieService.verifierConnexion(utilisateur.uuid, credentialId, reponse);
    if (!verifie) {
      await this.auditService.journaliser({
        utilisateurId: utilisateur.id,
        methode: MethodeConnexion.MATRICULE_EMPREINTE,
        statut: StatutTentative.ECHEC,
        ip,
        motifEchec: 'webauthn_invalide',
      });
      throw new ForbiddenException({ code: 'WEBAUTHN_CONNEXION_ECHOUEE', message: 'La verification biometrique a echoue.' });
    }
    const session = await this.ouvrirSession(
      utilisateur,
      appareilInfo ?? { identifiantLocal, nomAppareil: undefined, type: undefined, os: undefined },
      ip,
    );
    await this.auditService.journaliser({
      utilisateurId: utilisateur.id,
      methode: MethodeConnexion.MATRICULE_EMPREINTE,
      statut: StatutTentative.SUCCES,
      ip,
    });
    return session;
  }

  // ---------------------------------------------------------------------
  // Emission de session (commune a toutes les methodes de connexion)
  // ---------------------------------------------------------------------
  private async ouvrirSession(utilisateur: Utilisateur, appareilInfo: AppareilInfoDto, ip?: string) {
    const appareil = await this.appareilsService.trouverOuCreer(utilisateur.id, appareilInfo.identifiantLocal, {
      nomAppareil: appareilInfo.nomAppareil,
      type: appareilInfo.type,
      os: appareilInfo.os,
      ip,
    });

    const { token: accessToken, jti } = await this.jwtEmission.emettreAccessToken({
      sub: utilisateur.uuid,
      tenantId: utilisateur.tenantId,
      roleCode: utilisateur.role.code,
      familleAuth: utilisateur.role.familleAuth,
    });
    const refreshToken = await this.jwtEmission.emettreRefreshToken(utilisateur.uuid, jti);

    const ttlRefresh = dureeEnSecondes(this.config.get<string>('jwt.refreshTtl')!);
    await this.sessions.enregistrer(
      jti,
      {
        utilisateurUuid: utilisateur.uuid,
        appareilUuid: appareil.uuid,
        refreshTokenHash: jti,
        creeLe: new Date().toISOString(),
        expireLe: new Date(Date.now() + ttlRefresh * 1000).toISOString(),
      },
      ttlRefresh,
    );

    this.rabbitmq.publier('utilisateur.authentifie', {
      utilisateurUuid: utilisateur.uuid,
      tenantId: utilisateur.tenantId,
      roleCode: utilisateur.role.code,
      appareilUuid: appareil.uuid,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: dureeEnSecondes(this.config.get<string>('jwt.accessTtl')!),
      utilisateur: {
        uuid: utilisateur.uuid,
        nomComplet: utilisateur.nomComplet,
        role: utilisateur.role.code,
        tenantId: utilisateur.tenantId,
      },
      appareil: { uuid: appareil.uuid, faitConfiance: appareil.faitConfiance },
    };
  }

  // ---------------------------------------------------------------------
  // POST /auth/token/rafraichir
  // ---------------------------------------------------------------------
  async rafraichirToken(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwtEmission.verifierRefreshToken(refreshToken);
    } catch {
      throw new ForbiddenException({ code: 'REFRESH_TOKEN_INVALIDE', message: 'Le refresh token est invalide ou expire.' });
    }

    if (await this.blacklist.estRevoque(payload.jti)) {
      throw new ForbiddenException({ code: 'REFRESH_TOKEN_REVOQUE', message: 'Ce refresh token a ete revoque.' });
    }
    const session = await this.sessions.recuperer(payload.jti);
    if (!session) {
      throw new ForbiddenException({ code: 'SESSION_INTROUVABLE', message: 'Session introuvable ou expiree.' });
    }

    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(payload.sub);

    // Rotation : l'ancien jti est revoque, un nouveau couple access/refresh est emis.
    await this.blacklist.revoquer(payload.jti, 60);
    await this.sessions.revoquer(payload.jti);

    const { token: accessToken, jti: nouveauJti } = await this.jwtEmission.emettreAccessToken({
      sub: utilisateur.uuid,
      tenantId: utilisateur.tenantId,
      roleCode: utilisateur.role.code,
      familleAuth: utilisateur.role.familleAuth,
    });
    const nouveauRefresh = await this.jwtEmission.emettreRefreshToken(utilisateur.uuid, nouveauJti);
    const ttlRefresh = dureeEnSecondes(this.config.get<string>('jwt.refreshTtl')!);
    await this.sessions.enregistrer(
      nouveauJti,
      { ...session, refreshTokenHash: nouveauJti, creeLe: new Date().toISOString() },
      ttlRefresh,
    );

    return {
      accessToken,
      refreshToken: nouveauRefresh,
      expiresIn: dureeEnSecondes(this.config.get<string>('jwt.accessTtl')!),
    };
  }

  // ---------------------------------------------------------------------
  // POST /auth/deconnexion
  // ---------------------------------------------------------------------
  async deconnexion(jti: string, utilisateurUuid: string) {
    const ttlAccess = dureeEnSecondes(this.config.get<string>('jwt.accessTtl')!);
    await this.blacklist.revoquer(jti, ttlAccess);
    await this.sessions.revoquer(jti);
    this.rabbitmq.publier('utilisateur.deconnecte', { utilisateurUuid });
    return { code: 'DECONNEXION_REUSSIE' };
  }
}
