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
    try {
      if (dirigeantEmail) {
        const existant = await this.utilisateursService.trouverParEmail(dirigeantEmail.toLowerCase());
        if (existant) {
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
            await this.utilisateursService.creerUtilisateurAdministrateur({
              tenantId: tenantUuid,
              roleId:   roleAdmin.id,
              nomComplet: dirigeantNom,
              email:    dirigeantEmail?.toLowerCase() ?? null,
              telephone: telephoneE164,
            });
            this.logger.log(`Compte administrateur créé pour ${nomEtablissement} (${tenantUuid}).`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Échec création compte admin pour ${tenantUuid}: ${(err as Error).message}`);
    }

    /* ── 2. Notifications WhatsApp + e-mail au dirigeant ── */
    const url = urlAccueil ?? `https://${slug}.sigapei.com`;

    const msgWa =
      `*SIGAPEI - Établissement validé*\n\n` +
      `Félicitations, ${dirigeantNom} !\n\n` +
      `Votre établissement *${nomEtablissement}* a été validé et est désormais actif sur SIGAPEI.\n\n` +
      `*Vos identifiants administrateur :*\n` +
      `Identifiant de connexion : ${dirigeantEmail ?? dirigeantTelephone}\n` +
      `Matricule établissement : ${matricule}\n` +
      `Code public : ${code}\n\n` +
      `*Page d'accueil de votre établissement :*\n${url}\n\n` +
      `Connectez-vous dès maintenant pour accéder à votre espace de gestion.`;

    const promesses: Promise<any>[] = [];

    if (dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    if (dirigeantEmail) {
      promesses.push(
        this.email.envoyerNotificationOnboarding(dirigeantEmail.toLowerCase(), {
          sujet: `Votre établissement ${nomEtablissement} est validé - SIGAPEI`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#006B3C">SIGAPEI - Établissement validé</h2>
              <p>Félicitations, <strong>${dirigeantNom}</strong> !</p>
              <p>
                Votre établissement <strong>${nomEtablissement}</strong> a été validé
                et est désormais actif sur la plateforme SIGAPEI.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
              <h3 style="color:#1a2a1e;font-size:15px">Vos identifiants</h3>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:6px 0;color:#5a6b5f;width:180px">Identifiant de connexion</td><td><strong>${dirigeantEmail ?? dirigeantTelephone}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#5a6b5f">Matricule établissement</td><td><strong style="letter-spacing:2px">${matricule}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#5a6b5f">Code public</td><td><strong>${code}</strong></td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
              <p>
                <a href="${url}"
                   style="display:inline-block;padding:12px 24px;background:#006B3C;color:#FFF6DD;
                          border-radius:8px;text-decoration:none;font-weight:bold">
                  Accéder à mon espace établissement
                </a>
              </p>
              <p style="font-size:12px;color:#9ca3af;margin-top:24px">
                SIGAPEI - Ne répondez pas à cet e-mail automatique.
              </p>
            </div>`,
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
      `*SIGAPEI - Corrections requises*\n\n` +
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
