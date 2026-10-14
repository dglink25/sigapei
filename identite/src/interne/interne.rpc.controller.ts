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
        dirigeantNom: string;
        dirigeantEmail?: string;
        dirigeantTelephone?: string;
      };
    },
  ) {
    const evenement = data?.data ?? (data as any);
    const { tenantUuid, dirigeantNom, dirigeantEmail, dirigeantTelephone } = evenement;

    try {
      if (dirigeantEmail) {
        const existant = await this.utilisateursService.trouverParEmail(dirigeantEmail.toLowerCase());
        if (existant) {
          this.logger.log(`Compte deja existant pour ${dirigeantEmail}, evenement ignore (idempotence).`);
          return;
        }
      }

      const roles = await this.rolesService.lister();
      const roleAdmin = roles.find((r) => r.code === 'administrateur');
      if (!roleAdmin) {
        this.logger.error("Role 'administrateur' introuvable : impossible de creer le compte.");
        return;
      }

      let telephoneE164: string | null = null;
      if (dirigeantTelephone) {
        try {
          telephoneE164 = normaliserTelephoneE164(dirigeantTelephone).e164;
        } catch {
          this.logger.warn(`Telephone dirigeant invalide (${dirigeantTelephone}), compte cree sans telephone.`);
        }
      }

      await this.utilisateursService.creerUtilisateurAdministrateur({
        tenantId: tenantUuid,
        roleId: roleAdmin.id,
        nomComplet: dirigeantNom,
        email: dirigeantEmail?.toLowerCase() ?? null,
        telephone: telephoneE164,
      });

      this.logger.log(`Compte administrateur cree pour le tenant ${tenantUuid} (${dirigeantEmail ?? telephoneE164}).`);
    } catch (err) {
      this.logger.error(`Echec creation compte administrateur pour tenant ${tenantUuid}: ${(err as Error).message}`);
    }
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
      `*sigapei - Demande reçue*\n\n` +
      `Bonjour${d.dirigeantNom ? ` ${d.dirigeantNom}` : ''},\n\n` +
      `Votre demande d'inscription pour *${nomEtab}* a bien été reçue (réf. *${ref}*).\n\n` +
      `Notre équipe l'examine et vous contacte sous peu. Si des corrections sont nécessaires, ` +
      `vous recevrez un lien sécurisé pour les effectuer.\n\n` +
      `Ne répondez pas à ce message.`;

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
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
              <h2 style="color:#006B3C;margin-bottom:4px">sigapei</h2>
              <p>Bonjour${d.dirigeantNom ? ` <strong>${d.dirigeantNom}</strong>` : ''},</p>
              <p>Votre demande d'inscription pour <strong>${nomEtab}</strong> a bien été reçue.</p>
              <p>Référence du dossier : <strong style="font-size:18px;letter-spacing:3px;color:#006B3C">${ref}</strong></p>
              <p>Notre équipe l'examine et vous contacte sous peu.<br/>
              Si des corrections sont nécessaires, vous recevrez un lien sécurisé par e-mail et WhatsApp.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="color:#9ca3af;font-size:12px">sigapei - Ne répondez pas à cet e-mail automatique.</p>
            </div>`,
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
      `*sigapei - Corrections requises*\n\n` +
      `Votre dossier *${ref}* nécessite des corrections :\n\n` +
      `${lignesSections}\n\n` +
      `Accédez à votre lien sécurisé (valable 72 h) :\n${d.lienCorrection}\n\n` +
      `Ce lien est à usage unique. Ne le partagez pas.`;

    const promesses: Promise<any>[] = [];

    if (d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    if (d.dirigeantEmail) {
      const lignesHtml = Object.entries(d.champsACorriger ?? {})
        .map(([s, m]) => `<li><strong>${s}</strong>${m ? ` : ${m}` : ''}</li>`)
        .join('');

      promesses.push(
        this.email.envoyerNotificationOnboarding(d.dirigeantEmail, {
          sujet: `Action requise - dossier ${ref}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
              <h2 style="color:#006B3C;margin-bottom:4px">sigapei</h2>
              <p>Des corrections sont nécessaires sur votre dossier <strong>${ref}</strong> :</p>
              <ul style="padding-left:20px">${lignesHtml}</ul>
              <p style="margin:24px 0">
                <a href="${d.lienCorrection}"
                   style="display:inline-block;padding:14px 28px;background:#006B3C;color:#FFF6DD;
                          border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                  Accéder à mon dossier
                </a>
              </p>
              <p style="color:#b91c1c;font-size:13px">Ce lien est valable 72 heures et à usage unique.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="color:#9ca3af;font-size:12px">sigapei - Ne répondez pas à cet e-mail automatique.</p>
            </div>`,
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
}
