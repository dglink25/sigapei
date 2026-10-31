import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistRedis } from '../jetons/token-blacklist.redis';
import { SessionRedisService } from '../jetons/session.redis.service';
import { PayloadJwt } from '../jetons/jetons.types';
import { RolesService } from '../roles/roles.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { normaliserTelephoneE164 } from '../common/utils/phone.util';
import { ConvessaProvider } from '../integrations/whatsapp/convessa.provider';
import { SmtpAppPasswordProvider } from '../integrations/email/smtp-app-password.provider';
import { SmsGatewayMaisonProvider } from '../integrations/sms/sms-gateway-maison.provider';

@Controller()
export class InterneRpcController {
  private readonly logger = new Logger(InterneRpcController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly sessions: SessionRedisService,
    private readonly rolesService: RolesService,
    private readonly utilisateursService: UtilisateursService,
    private readonly whatsapp: ConvessaProvider,
    private readonly email: SmtpAppPasswordProvider,
    private readonly sms: SmsGatewayMaisonProvider,
  ) {}

  @MessagePattern('identite.introspection')
  async introspection(@Payload() data: { token: string }) {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(data.token, {
        secret: this.config.get<string>('jwt.accessSecret'),
        issuer: this.config.get<string>('jwt.issuer'),
      });
      if (await this.blacklist.estRevoque(payload.jti)) return { valide: false, motif: 'JETON_REVOQUE' };
      const session = await this.sessions.recuperer(payload.jti);
      if (!session) return { valide: false, motif: 'SESSION_INTROUVABLE' };
      return { valide: true, sub: payload.sub, tenantId: payload.tenantId, roleCode: payload.roleCode };
    } catch {
      return { valide: false, motif: 'JETON_INVALIDE_OU_EXPIRE' };
    }
  }

  @EventPattern('etablissement.valide')
  async surEtablissementValide(
    @Payload()
    data: {
      data: {
        tenantUuid: string;
        nomEtablissement: string;
        code: string;
        slug: string;
        matricule: string;
        urlAccueil?: string;
        dirigeantNom: string;
        dirigeantEmail?: string;
        dirigeantTelephone?: string;
      };
    },
  ) {
    const ev = data?.data ?? (data as any);
    const {
      tenantUuid, nomEtablissement, code, slug, matricule, urlAccueil,
      dirigeantNom, dirigeantEmail, dirigeantTelephone,
    } = ev;

    /* ── 1. Créer le compte administrateur ── */
    let matriculeAdmin: string | null = null;
    try {
      if (dirigeantEmail) {
        const existant = await this.utilisateursService.trouverParEmail(dirigeantEmail.toLowerCase());
        if (existant) {
          matriculeAdmin = existant.matricule ?? null;
          this.logger.log(`Compte deja existant pour ${dirigeantEmail}, evenement ignore (idempotence).`);
          // Même si le compte existe, on envoie quand même les notifications ci-dessous
        } else {
          const roles    = await this.rolesService.lister();
          const roleAdmin = roles.find((r) => r.code === 'administrateur');
          if (!roleAdmin) {
            this.logger.error("Role 'administrateur' introuvable.");
          } else {
            let telephoneE164: string | null = null;
            if (dirigeantTelephone) {
              try { telephoneE164 = normaliserTelephoneE164(dirigeantTelephone).e164; } catch { /* ignore */ }
            }
            matriculeAdmin = await this.utilisateursService.genererMatriculeUnique(code);
            await this.utilisateursService.creerUtilisateurAdministrateur({
              tenantId: tenantUuid,
              roleId:   roleAdmin.id,
              nomComplet: dirigeantNom,
              email:    dirigeantEmail?.toLowerCase() ?? null,
              telephone: telephoneE164,
              matricule: matriculeAdmin,
            });
            this.logger.log(`Compte administrateur créé pour ${nomEtablissement} (${tenantUuid}) avec matricule ${matriculeAdmin}.`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Échec création compte admin pour ${tenantUuid}: ${(err as Error).message}`);
    }

    /* ── 2. Notifications SMS + WhatsApp + e-mail au dirigeant ── */
    const url = urlAccueil ?? `https://${slug}.sigapei.com`;

    const msgWa =
      `*SIGAPEI - Établissement validé*\n\n` +
      `Félicitations, ${dirigeantNom}\n\n` +
      `Votre établissement *${nomEtablissement}* a été validé et est désormais actif sur SIGAPEI.\n\n` +
      `*Vos identifiants administrateur :*\n` +
      `Identifiant de connexion : ${dirigeantEmail ?? dirigeantTelephone}\n` +
      (matriculeAdmin ? `Matricule administrateur : ${matriculeAdmin}\n` : '') +
      `Matricule établissement : ${matricule}\n` +
      `Code public : ${code}\n\n` +
      `*Page d'accueil :*\n${url}\n\n` +
      `Connectez-vous dès maintenant pour accéder à votre espace de gestion.\n\n` +
      `SIGAPEI - Plateforme E-Académique`;

    const promesses: Promise<any>[] = [];

    if (dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
        const msgSms =
          `SIGAPEI: Félicitations ${dirigeantNom}! Votre établissement ${nomEtablissement} est validé.` +
          (matriculeAdmin ? ` Matricule admin: ${matriculeAdmin}.` : '') +
          ` Code: ${code}. Accès: ${url}`;
        promesses.push(this.sms.envoyerMessage(tel, msgSms));
      } catch { /* numéro invalide */ }
    }

    if (dirigeantEmail) {
      promesses.push(
        this.email.envoyerNotificationOnboarding(dirigeantEmail.toLowerCase(), {
          sujet: `Votre établissement ${nomEtablissement} est validé - SIGAPEI`,
          titreCourrier: 'Établissement validé',
          corps: `
            <p style="margin:0 0 16px;color:#5a6b5f;font-size:14px">Félicitations, <strong style="color:#1a2a1e">${dirigeantNom}</strong>,</p>
            <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
              Votre établissement <strong>${nomEtablissement}</strong> a été validé
              et est désormais actif sur la plateforme SIGAPEI.
            </p>
            <p style="margin:0 0 12px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Vos identifiants administrateur</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dde4df;border-radius:8px;overflow:hidden;margin-bottom:24px">
              <tr style="background:#f7faf8">
                <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;width:200px">Identifiant de connexion</td>
                <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600">${dirigeantEmail ?? dirigeantTelephone}</td>
              </tr>
              ${matriculeAdmin ? `
              <tr>
                <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Matricule administrateur</td>
                <td style="padding:10px 18px;color:#006B3C;font-size:14px;font-weight:700;letter-spacing:1px;border-top:1px solid #dde4df">${matriculeAdmin}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Matricule établissement</td>
                <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600;letter-spacing:2px;border-top:1px solid #dde4df">${matricule}</td>
              </tr>
              <tr style="background:#f7faf8">
                <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Code public</td>
                <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600;border-top:1px solid #dde4df">${code}</td>
              </tr>
            </table>
            ${this.email.construireBoutonCta(url, 'Accéder à mon espace établissement')}
          `,
        }),
      );
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications établissement.valide envoyées pour ${nomEtablissement} (${code}).`);
  }

  @EventPattern('demande.soumise')
  async surDemandeSoumise(
    @Payload()
    data: {
      data?: {
        demandeUuid: string;
        etablissementNom?: string;
        etablissementEmail?: string;
        etablissementTelephone1?: string;
        dirigeantNom?: string;
        dirigeantEmail?: string;
        dirigeantTelephone?: string;
      };
    },
  ) {
    const d = (data as any)?.data ?? data;
    const ref = (d.demandeUuid ?? '').slice(0, 8).toUpperCase();
    const nomEtab = d.etablissementNom ?? 'votre établissement';

    const msgWa =
      `*SIGAPEI - Demande reçue*\n\n` +
      `Bonjour${d.dirigeantNom ? ` ${d.dirigeantNom}` : ''},\n\n` +
      `Votre demande d'inscription pour *${nomEtab}* a bien été reçue (réf. *${ref}*).\n\n` +
      `Notre équipe l'examine et vous contacte sous peu. Si des corrections sont nécessaires, ` +
      `vous recevrez un lien sécurisé pour les effectuer.\n\n` +
      `SIGAPEI - Plateforme E-Académique`;

    const promesses: Promise<any>[] = [];

    // WhatsApp - dirigeant
    if (d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }
    // WhatsApp - établissement (si numéro différent du dirigeant)
    if (d.etablissementTelephone1 && d.etablissementTelephone1 !== d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.etablissementTelephone1).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    // Email - tous destinataires uniques
    const destinataires = [...new Set([d.dirigeantEmail, d.etablissementEmail].filter(Boolean) as string[])];
    for (const dest of destinataires) {
      promesses.push(
        this.email.envoyerNotificationOnboarding(dest, {
          sujet: `Demande reçue - réf. ${ref}`,
          titreCourrier: 'Demande reçue',
          corps: `
            <p style="margin:0 0 16px;color:#5a6b5f;font-size:14px">Bonjour${d.dirigeantNom ? ` <strong style="color:#1a2a1e">${d.dirigeantNom}</strong>` : ''},</p>
            <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
              Votre demande d'inscription pour <strong>${nomEtab}</strong> a bien été reçue.
            </p>
            <p style="margin:0 0 8px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Référence du dossier</p>
            <p style="margin:0 0 24px">
              <span style="display:inline-block;font-family:'Century Gothic','Poppins',monospace;font-size:24px;font-weight:700;letter-spacing:4px;color:#006B3C;background:#f7faf8;border:1px solid #dde4df;border-radius:8px;padding:12px 24px">
                ${ref}
              </span>
            </p>
            <p style="margin:0 0 12px;color:#1a2a1e;font-size:14px;line-height:1.6">
              Notre équipe l'examine et vous contacte sous peu.
            </p>
            <p style="margin:0;color:#1a2a1e;font-size:14px;line-height:1.6">
              Si des corrections sont nécessaires, vous recevrez un lien sécurisé par e-mail et WhatsApp.
            </p>
          `,
        }),
      );
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications demande.soumise envoyées (ref ${ref})`);
  }

  /**
   * demande.correction_demandee → lien de correction sécurisé au dirigeant.
   */
  @EventPattern('demande.correction_demandee')
  async surCorrectionDemandee(
    @Payload()
    data: {
      data?: {
        demandeUuid: string;
        champsACorriger: Record<string, string>;
        lienCorrection: string;
        dirigeantEmail?: string;
        dirigeantTelephone?: string;
      };
    },
  ) {
    const d = (data as any)?.data ?? data;
    const ref = (d.demandeUuid ?? '').slice(0, 8).toUpperCase();
    const lignesSections = Object.entries(d.champsACorriger ?? {})
      .map(([s, m]) => `• ${s}${m ? ` : ${m}` : ''}`)
      .join('\n');

    const msgWa =
      `*SIGAPEI - Corrections requises*\n\n` +
      `Votre dossier *${ref}* nécessite des corrections :\n\n` +
      `${lignesSections}\n\n` +
      `Accédez à votre lien sécurisé (valable 72 h) :\n${d.lienCorrection}\n\n` +
      `Ce lien est à usage unique. Ne le partagez pas.\n\n` +
      `SIGAPEI - Plateforme E-Académique`;

    const promesses: Promise<any>[] = [];

    if (d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    if (d.dirigeantEmail) {
      const lignesHtml = Object.entries(d.champsACorriger ?? {})
        .map(([s, m]) => `<li style="margin-bottom:8px;color:#1a2a1e;font-size:14px"><strong>${s}</strong>${m ? ` : ${m}` : ''}</li>`)
        .join('');

      promesses.push(
        this.email.envoyerNotificationOnboarding(d.dirigeantEmail, {
          sujet: `Action requise - dossier ${ref}`,
          titreCourrier: 'Corrections requises',
          corps: `
            <p style="margin:0 0 20px;color:#5a6b5f;font-size:14px">Bonjour,</p>
            <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
              Des corrections sont nécessaires sur votre dossier
              <strong style="color:#006B3C">${ref}</strong>.
            </p>
            <p style="margin:0 0 12px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Champs à corriger</p>
            <ul style="margin:0 0 24px;padding-left:20px;background:#f7faf8;border:1px solid #dde4df;border-radius:8px;padding:16px 20px">
              ${lignesHtml}
            </ul>
            ${this.email.construireBoutonCta(d.lienCorrection, 'Accéder à mon dossier')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;background:#fef9ef;border:1px solid #f5e0b3;border-radius:8px">
              <tr>
                <td style="padding:14px 18px">
                  <p style="margin:0;font-size:13px;color:#92702a;line-height:1.5">
                    Ce lien est valable <strong>72 heures</strong> et à usage unique.
                    Ne le partagez avec personne.
                  </p>
                </td>
              </tr>
            </table>
          `,
        }),
      );
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications demande.correction_demandee envoyées (ref ${ref})`);
  }

  /**
   * demande.correction_relance → même notification que correction_demandee.
   */
  @EventPattern('demande.correction_relance')
  async surCorrectionRelance(@Payload() data: any) {
    return this.surCorrectionDemandee(data);
  }

  /**
   * utilisateur.cree → notifie le nouvel utilisateur par WhatsApp et e-mail.
   * Lui communique son identifiant de connexion et l'URL du portail.
   */
  @EventPattern('utilisateur.cree')
  async surUtilisateurCree(
    @Payload()
    data: {
      data?: {
        utilisateurUuid: string;
        tenantId: string;
        roleCode: string;
      };
    },
  ) {
    const d = (data as any)?.data ?? data;
    if (!d?.utilisateurUuid) return;

    // Recharger l'utilisateur complet depuis la base pour avoir ses coordonnées
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(d.utilisateurUuid).catch(() => null);
    if (!utilisateur) return;

    const nom         = utilisateur.nomComplet;
    const telephone   = utilisateur.telephone;
    const emailAddr   = utilisateur.email;
    const identifiant = emailAddr ?? telephone ?? 'votre identifiant enregistré';

    const msgWa =
      `*SIGAPEI - Bienvenue*\n\n` +
      `Bonjour ${nom},\n\n` +
      `Un compte a été créé pour vous sur la plateforme *SIGAPEI*.\n\n` +
      `*Vos identifiants de connexion :*\n` +
      `Identifiant : ${identifiant}\n` +
      (utilisateur.matricule ? `Matricule : ${utilisateur.matricule}\n` : '') +
      `\nConnectez-vous sur SIGAPEI pour accéder à vos services.\n\n` +
      `SIGAPEI - Plateforme E-Académique`;

    const promesses: Promise<any>[] = [];

    if (telephone) {
      try {
        const tel = normaliserTelephoneE164(telephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
        const msgSms =
          `SIGAPEI: Bonjour ${nom}, votre compte a été créé.` +
          (utilisateur.matricule ? ` Matricule: ${utilisateur.matricule}.` : '') +
          ` Identifiant: ${identifiant}. Connectez-vous sur la plateforme.`;
        promesses.push(this.sms.envoyerMessage(tel, msgSms));
      } catch { /* numéro invalide */ }
    }

    if (emailAddr) {
      promesses.push(
        this.email.envoyerNotificationOnboarding(emailAddr.toLowerCase(), {
          sujet: 'Votre compte SIGAPEI est prêt',
          titreCourrier: 'Bienvenue sur SIGAPEI',
          corps: `
            <p style="margin:0 0 16px;color:#5a6b5f;font-size:14px">Bonjour <strong style="color:#1a2a1e">${nom}</strong>,</p>
            <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
              Un compte vous a été créé sur la plateforme SIGAPEI.
            </p>
            <p style="margin:0 0 12px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Vos accès SIGAPEI</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #dde4df;border-radius:8px;overflow:hidden;margin-bottom:24px">
              <tr style="background:#f7faf8">
                <td style="padding:12px 18px;color:#5a6b5f;font-size:14px;width:180px">Identifiant de connexion</td>
                <td style="padding:12px 18px;color:#1a2a1e;font-size:15px;font-weight:700">
                  ${identifiant}
                </td>
              </tr>
              ${utilisateur.matricule ? `
              <tr>
                <td style="padding:12px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Matricule personnel</td>
                <td style="padding:12px 18px;color:#006B3C;font-size:15px;font-weight:700;letter-spacing:1px;border-top:1px solid #dde4df">
                  ${utilisateur.matricule}
                </td>
              </tr>` : ''}
            </table>
            <p style="margin:0;color:#5a6b5f;font-size:14px;line-height:1.6">
              Connectez-vous avec cet identifiant pour accéder à vos services.
            </p>
          `,
        }),
      );
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notification utilisateur.cree envoyée pour ${d.utilisateurUuid}`);
  }
}
