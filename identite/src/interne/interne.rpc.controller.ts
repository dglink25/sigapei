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

  // ─────────────────────────────────────────────────────────────────────────
  // INTROSPECTION JWT
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // ÉTABLISSEMENT VALIDÉ
  // ─────────────────────────────────────────────────────────────────────────

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
    const { tenantUuid, nomEtablissement, code, slug, matricule, urlAccueil,
            dirigeantNom, dirigeantEmail, dirigeantTelephone } = ev;

    // ── 1. Créer le compte administrateur ──
    let matriculeAdmin: string | null = null;
    try {
      if (dirigeantEmail) {
        const existant = await this.utilisateursService.trouverParEmail(dirigeantEmail.toLowerCase());
        if (existant) {
          matriculeAdmin = existant.matricule ?? null;
          this.logger.log(`Compte existant pour ${dirigeantEmail} — idempotence respectée.`);
        } else {
          const roles     = await this.rolesService.lister();
          const roleAdmin = roles.find((r) => r.code === 'administrateur');
          if (!roleAdmin) {
            this.logger.error("Rôle 'administrateur' introuvable en base.");
          } else {
            let telephoneE164: string | null = null;
            if (dirigeantTelephone) {
              try { telephoneE164 = normaliserTelephoneE164(dirigeantTelephone).e164; } catch { /* ignore */ }
            }
            matriculeAdmin = await this.utilisateursService.genererMatriculeUnique(code);
            await this.utilisateursService.creerUtilisateurAdministrateur({
              tenantId:   tenantUuid,
              roleId:     roleAdmin.id,
              nomComplet: dirigeantNom,
              email:      dirigeantEmail?.toLowerCase() ?? null,
              telephone:  telephoneE164,
              matricule:  matriculeAdmin,
            });
            this.logger.log(`Compte administrateur créé — ${nomEtablissement} (${matriculeAdmin}).`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Création compte admin — ${tenantUuid} : ${(err as Error).message}`);
    }

    // ── 2. Notifications ──
    const url = urlAccueil ?? `https://${slug}.sigapei.com`;
    const identifiantConnexion = dirigeantEmail ?? dirigeantTelephone ?? '—';
    const promesses: Promise<any>[] = [];

    // WhatsApp
    const msgWa = this.waMsgEtablissementValide({
      dirigeantNom, nomEtablissement, identifiantConnexion,
      matriculeAdmin, matricule, code, url,
    });
    if (dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
        promesses.push(this.sms.envoyerMessage(tel,
          `SIGAPEI — ${nomEtablissement} est enregistré.` +
          (matriculeAdmin ? ` Matricule admin. : ${matriculeAdmin}.` : '') +
          ` Identifiant : ${identifiantConnexion}. Accès : ${url}`,
        ));
      } catch { /* numéro invalide */ }
    }

    // E-mail
    if (dirigeantEmail) {
      const lignes: Array<{ libelle: string; valeur: string; accentuer?: boolean }> = [
        { libelle: 'Identifiant de connexion', valeur: identifiantConnexion },
        ...(matriculeAdmin ? [{ libelle: 'Matricule administrateur', valeur: matriculeAdmin, accentuer: true }] : []),
        { libelle: "Matricule de l'établissement", valeur: matricule, accentuer: true },
        { libelle: 'Code public', valeur: code },
      ];

      promesses.push(this.email.envoyerNotificationOnboarding(dirigeantEmail.toLowerCase(), {
        sujet: `Enregistrement de ${nomEtablissement} — SIGAPEI`,
        titreCourrier: 'Enregistrement confirmé',
        corps: `
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.6">
            Monsieur / Madame <strong style="color:#0D1F14">${dirigeantNom}</strong>,
          </p>
          <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.7">
            Nous avons le plaisir de vous informer que l'établissement
            <strong style="color:#0D1F14">${nomEtablissement}</strong>
            a été enregistré sur la plateforme SIGAPEI et est désormais opérationnel.
          </p>
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;
                     font-size:11px;font-weight:700;color:#8A9E92;
                     letter-spacing:1.5px;text-transform:uppercase">
            Accès administrateur
          </p>
          ${this.email.construireTableauDonnees(lignes)}
          ${this.email.construireBoutonCta(url, 'Accéder à l\'espace de gestion')}
          ${this.email.construireBlocInfo(
            'Conservez ces informations en lieu sûr. ' +
            'Pour toute assistance, contactez le support de la plateforme.',
          )}`,
      }));
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications établissement.valide — ${nomEtablissement} (${code}).`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMANDE SOUMISE
  // ─────────────────────────────────────────────────────────────────────────

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
    const d       = (data as any)?.data ?? data;
    const ref     = (d.demandeUuid ?? '').slice(0, 8).toUpperCase();
    const nomEtab = d.etablissementNom ?? 'votre établissement';
    const civil   = d.dirigeantNom ? `Monsieur / Madame ${d.dirigeantNom}` : 'Madame, Monsieur';

    const msgWa =
      `SIGAPEI — Accusé de réception\n\n` +
      `${civil},\n\n` +
      `Votre demande d'inscription pour *${nomEtab}* a bien été reçue sous la référence *${ref}*.\n\n` +
      `Elle est en cours d'instruction. Vous serez contacté(e) dès qu'une décision sera rendue ` +
      `ou si des compléments vous sont demandés.\n\n` +
      `Référence : ${ref}\n\n` +
      `SIGAPEI — Système Intégré de Gestion Académique`;

    const promesses: Promise<any>[] = [];

    if (d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }
    if (d.etablissementTelephone1 && d.etablissementTelephone1 !== d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.etablissementTelephone1).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    const destinataires = [...new Set([d.dirigeantEmail, d.etablissementEmail].filter(Boolean) as string[])];
    for (const dest of destinataires) {
      promesses.push(this.email.envoyerNotificationOnboarding(dest, {
        sujet: `Accusé de réception — réf. ${ref}`,
        titreCourrier: 'Accusé de réception',
        corps: `
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.6">${civil},</p>
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.7">
            Nous accusons bonne réception de votre demande d'inscription
            pour l'établissement <strong style="color:#0D1F14">${nomEtab}</strong>.
          </p>
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;
                     font-size:11px;font-weight:700;color:#8A9E92;
                     letter-spacing:1.5px;text-transform:uppercase">
            Référence du dossier
          </p>
          ${this.email.construireTableauDonnees([
            { libelle: 'Référence', valeur: ref, accentuer: true },
            { libelle: 'Établissement', valeur: nomEtab },
          ])}
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.7">
            Votre dossier est en cours d'instruction par notre équipe.
            Vous serez informé(e) de toute décision ou demande de complément
            par e-mail et par message WhatsApp.
          </p>
          ${this.email.construireBlocInfo(
            'Conservez cette référence pour tout suivi de votre dossier. ' +
            'Ne répondez pas à cet e-mail ; utilisez les coordonnées officielles de SIGAPEI.',
          )}`,
      }));
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications demande.soumise — réf. ${ref}.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORRECTION DEMANDÉE
  // ─────────────────────────────────────────────────────────────────────────

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
    const d   = (data as any)?.data ?? data;
    const ref = (d.demandeUuid ?? '').slice(0, 8).toUpperCase();

    const lignesWa = Object.entries(d.champsACorriger ?? {})
      .map(([s, m]) => `  • ${s}${m ? ` : ${m}` : ''}`)
      .join('\n');

    const msgWa =
      `SIGAPEI — Action requise\n\n` +
      `Madame, Monsieur,\n\n` +
      `Des compléments ou corrections sont attendus sur votre dossier *${ref}*.\n\n` +
      `Éléments concernés :\n${lignesWa}\n\n` +
      `Accédez à votre dossier via le lien sécurisé ci-dessous (valable 72 heures) :\n` +
      `${d.lienCorrection}\n\n` +
      `Ce lien est strictement personnel et à usage unique.\n\n` +
      `SIGAPEI — Système Intégré de Gestion Académique`;

    const promesses: Promise<any>[] = [];

    if (d.dirigeantTelephone) {
      try {
        const tel = normaliserTelephoneE164(d.dirigeantTelephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
      } catch { /* numéro invalide */ }
    }

    if (d.dirigeantEmail) {
      const lignesHtml = Object.entries(d.champsACorriger ?? {})
        .map(([s, m]) => `
          <tr>
            <td style="padding:9px 16px;font-family:Arial,Helvetica,sans-serif;
                       font-size:13px;color:#0D1F14;font-weight:600;
                       border-top:1px solid #EBF0ED;width:200px">${s}</td>
            <td style="padding:9px 16px;font-family:Arial,Helvetica,sans-serif;
                       font-size:13px;color:#5A6B5F;
                       border-top:1px solid #EBF0ED">${m ?? ''}</td>
          </tr>`)
        .join('');

      promesses.push(this.email.envoyerNotificationOnboarding(d.dirigeantEmail, {
        sujet: `Compléments requis — dossier ${ref}`,
        titreCourrier: 'Compléments requis',
        corps: `
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.6">
            Madame, Monsieur,
          </p>
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.7">
            L'instruction de votre dossier
            <strong style="color:#0D1F14;font-family:'Courier New',Courier,monospace">${ref}</strong>
            appelle des compléments ou corrections avant de pouvoir être poursuivie.
          </p>
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;
                     font-size:11px;font-weight:700;color:#8A9E92;
                     letter-spacing:1.5px;text-transform:uppercase">
            Éléments à corriger
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid #DDE4DF;border-radius:4px;overflow:hidden;
                        margin-bottom:28px">
            <tr style="background:#F7FAF8">
              <td style="padding:9px 16px;font-family:Arial,Helvetica,sans-serif;
                         font-size:11px;font-weight:700;color:#8A9E92;
                         letter-spacing:1px;text-transform:uppercase;width:200px">Section</td>
              <td style="padding:9px 16px;font-family:Arial,Helvetica,sans-serif;
                         font-size:11px;font-weight:700;color:#8A9E92;
                         letter-spacing:1px;text-transform:uppercase">Observation</td>
            </tr>
            ${lignesHtml}
          </table>
          ${this.email.construireBoutonCta(d.lienCorrection, 'Accéder à mon dossier')}
          ${this.email.construireBlocInfo(
            'Ce lien est valable <strong>72 heures</strong> à compter de la réception ' +
            'de ce message. Il est strictement personnel et ne doit pas être transmis à un tiers.',
            'alerte',
          )}`,
      }));
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications demande.correction_demandee — réf. ${ref}.`);
  }

  @EventPattern('demande.correction_relance')
  async surCorrectionRelance(@Payload() data: any) {
    return this.surCorrectionDemandee(data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILISATEUR CRÉÉ
  // ─────────────────────────────────────────────────────────────────────────

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

    const utilisateur = await this.utilisateursService
      .trouverParUuidOuEchouer(d.utilisateurUuid)
      .catch(() => null);
    if (!utilisateur) return;

    const nom         = utilisateur.nomComplet;
    const telephone   = utilisateur.telephone;
    const emailAddr   = utilisateur.email;
    const identifiant = emailAddr ?? telephone ?? '—';

    const lignes: Array<{ libelle: string; valeur: string; accentuer?: boolean }> = [
      { libelle: 'Identifiant de connexion', valeur: identifiant },
      ...(utilisateur.matricule
        ? [{ libelle: 'Matricule', valeur: utilisateur.matricule, accentuer: true }]
        : []),
    ];

    const msgWa =
      `SIGAPEI — Ouverture de compte\n\n` +
      `Madame, Monsieur ${nom},\n\n` +
      `Un compte vous a été ouvert sur la plateforme SIGAPEI.\n\n` +
      `Identifiant de connexion : ${identifiant}\n` +
      (utilisateur.matricule ? `Matricule : ${utilisateur.matricule}\n` : '') +
      `\nConnectez-vous sur la plateforme pour accéder à vos services.\n\n` +
      `SIGAPEI — Système Intégré de Gestion Académique`;

    const promesses: Promise<any>[] = [];

    if (telephone) {
      try {
        const tel = normaliserTelephoneE164(telephone).e164;
        promesses.push(this.whatsapp.envoyerMessage(tel, msgWa));
        promesses.push(this.sms.envoyerMessage(tel,
          `SIGAPEI — Un compte a été ouvert à votre nom.` +
          (utilisateur.matricule ? ` Matricule : ${utilisateur.matricule}.` : '') +
          ` Identifiant : ${identifiant}.`,
        ));
      } catch { /* numéro invalide */ }
    }

    if (emailAddr) {
      promesses.push(this.email.envoyerNotificationOnboarding(emailAddr.toLowerCase(), {
        sujet: `Ouverture de compte — SIGAPEI`,
        titreCourrier: 'Ouverture de compte',
        corps: `
          <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.6">
            Madame, Monsieur <strong style="color:#0D1F14">${nom}</strong>,
          </p>
          <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#3D4F44;line-height:1.7">
            Un compte a été ouvert à votre nom sur la plateforme SIGAPEI.
            Vous trouverez ci-dessous vos informations d'accès.
          </p>
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;
                     font-size:11px;font-weight:700;color:#8A9E92;
                     letter-spacing:1.5px;text-transform:uppercase">
            Informations d'accès
          </p>
          ${this.email.construireTableauDonnees(lignes)}
          ${this.email.construireBlocInfo(
            'Conservez ces informations en lieu sûr. ' +
            'En cas de difficulté de connexion, contactez l\'administrateur de votre établissement.',
          )}`,
      }));
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notification utilisateur.cree — ${d.utilisateurUuid}.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVÉS
  // ─────────────────────────────────────────────────────────────────────────

  private waMsgEtablissementValide(p: {
    dirigeantNom: string;
    nomEtablissement: string;
    identifiantConnexion: string;
    matriculeAdmin: string | null;
    matricule: string;
    code: string;
    url: string;
  }): string {
    return (
      `SIGAPEI — Enregistrement confirmé\n\n` +
      `Monsieur / Madame ${p.dirigeantNom},\n\n` +
      `L'établissement *${p.nomEtablissement}* a été enregistré sur la plateforme SIGAPEI ` +
      `et est désormais opérationnel.\n\n` +
      `Accès administrateur :\n` +
      `  Identifiant : ${p.identifiantConnexion}\n` +
      (p.matriculeAdmin ? `  Matricule admin. : ${p.matriculeAdmin}\n` : '') +
      `  Matricule étab. : ${p.matricule}\n` +
      `  Code public : ${p.code}\n\n` +
      `Espace de gestion :\n${p.url}\n\n` +
      `SIGAPEI — Système Intégré de Gestion Académique`
    );
  }
}
