import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envoi d'e-mails transactionnels via SMTP applicatif.
 * Tous les messages utilisent le template institutionnel SIGAPEI.
 */
@Injectable()
export class SmtpAppPasswordProvider implements OnModuleInit {
  private readonly logger = new Logger(SmtpAppPasswordProvider.name);
  private transporteur: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporteur = nodemailer.createTransport({
      host: this.config.get<string>('smtp.host'),
      port: this.config.get<number>('smtp.port'),
      secure: this.config.get<boolean>('smtp.secure'),
      auth: {
        user: this.config.get<string>('smtp.user'),
        pass: this.config.get<string>('smtp.appPassword'),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporteur.verify();
      this.logger.log('Connexion SMTP vérifiée');
    } catch (err) {
      this.logger.warn(`SMTP indisponible : ${(err as Error).message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPLATE INSTITUTIONNEL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Enveloppe HTML institutionnelle SIGAPEI.
   * Structure : bandeau vert + accent or · corps · pied de page sobre.
   * Compatible avec tous les clients e-mail majeurs (Gmail, Outlook, Apple Mail).
   */
  construireEnveloppeHtml({ titreCourrier, corps }: { titreCourrier: string; corps: string }): string {
    const annee = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${titreCourrier}</title>
</head>
<body style="margin:0;padding:0;background:#EFF3F1;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFF3F1">
    <tr>
      <td align="center" style="padding:32px 16px 40px">

        <!-- Carte principale -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;
                      box-shadow:0 1px 4px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.04)">

          <!-- ═══ EN-TÊTE ═══ -->
          <tr>
            <td style="background:#006B3C;padding:0;border-radius:4px 4px 0 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 40px 24px">
                    <!-- Marque -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;
                                    font-size:28px;font-weight:700;color:#FFF6DD;
                                    letter-spacing:3px;line-height:1">SIGAPEI</p>
                          <p style="margin:5px 0 0;font-family:Arial,Helvetica,sans-serif;
                                    font-size:11px;color:rgba(255,246,221,0.65);
                                    letter-spacing:2px;text-transform:uppercase;line-height:1">
                            Système Intégré de Gestion Académique
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Accents graphiques -->
                  <td style="padding:28px 40px 24px;text-align:right;vertical-align:middle">
                    <span style="display:inline-block;width:8px;height:8px;
                                 background:#E9AA20;border-radius:50%;margin-left:6px"></span>
                    <span style="display:inline-block;width:8px;height:8px;
                                 background:rgba(233,170,32,0.5);border-radius:50%;margin-left:6px"></span>
                    <span style="display:inline-block;width:8px;height:8px;
                                 background:rgba(233,170,32,0.2);border-radius:50%;margin-left:6px"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Liseré doré -->
          <tr>
            <td style="background:#E9AA20;height:3px;line-height:3px;font-size:0">&nbsp;</td>
          </tr>

          <!-- ═══ CORPS ═══ -->
          <tr>
            <td style="padding:40px 40px 8px">

              <!-- Titre du courrier -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:28px">
                <tr>
                  <td style="border-left:4px solid #006B3C;padding-left:14px">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;
                               font-size:19px;font-weight:700;color:#0D1F14;
                               line-height:1.3;letter-spacing:0.2px">${titreCourrier}</p>
                  </td>
                </tr>
              </table>

              <!-- Corps fourni par l'appelant -->
              ${corps}

            </td>
          </tr>

          <!-- ═══ SÉPARATEUR ═══ -->
          <tr>
            <td style="padding:0 40px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #DDE4DF;height:1px;font-size:0">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ PIED DE PAGE ═══ -->
          <tr>
            <td style="padding:24px 40px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top">
                    <p style="margin:0 0 2px;font-family:Georgia,'Times New Roman',serif;
                               font-size:13px;font-weight:700;color:#006B3C;letter-spacing:1.5px">
                      SIGAPEI
                    </p>
                    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;
                               font-size:11px;color:#8A9E92;letter-spacing:0.3px">
                      Système Intégré de Gestion Académique
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                               font-size:11px;color:#A8B8B0;line-height:1.6">
                      Cet e-mail est généré automatiquement.<br/>
                      Merci de ne pas y répondre directement.
                    </p>
                  </td>
                  <td style="vertical-align:top;text-align:right;padding-left:20px;white-space:nowrap">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                               font-size:11px;color:#C5D0CA">© ${annee} SIGAPEI</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Carte principale -->

        <!-- Mention légale sous la carte -->
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;
                   font-size:11px;color:#9BB0A4;text-align:center;line-height:1.6">
          Vous recevez ce message car votre adresse est liée à un compte SIGAPEI.<br/>
          Pour toute question, contactez votre administrateur de plateforme.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOSANTS RÉUTILISABLES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bloc de code OTP : grands chiffres espacés sur fond sobre.
   */
  private construireBlocOtp(code: string, dureeMinutes: number): string {
    return `
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;
                 font-size:11px;font-weight:700;color:#8A9E92;
                 letter-spacing:1.5px;text-transform:uppercase">Code de vérification</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             style="margin-bottom:24px">
        <tr>
          <td style="background:#F7FAF8;border:1px solid #DDE4DF;border-radius:4px;
                     padding:18px 36px;text-align:center">
            <p style="margin:0;font-family:'Courier New',Courier,monospace;
                       font-size:38px;font-weight:700;color:#006B3C;
                       letter-spacing:14px;line-height:1">${code}</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin-bottom:0">
        <tr>
          <td style="background:#FDFAF2;border-left:3px solid #E9AA20;
                     padding:12px 16px;border-radius:0 4px 4px 0">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                       font-size:12px;color:#8A7020;line-height:1.5">
              Ce code est valable <strong>${dureeMinutes}&nbsp;minutes</strong>
              et ne peut être utilisé qu'une seule fois.
              Ne le communiquez à personne.
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Tableau de données : liste de paires libellé / valeur.
   * Usage : identifiants, références, coordonnées…
   */
  construireTableauDonnees(lignes: Array<{ libelle: string; valeur: string; accentuer?: boolean }>): string {
    const rangees = lignes.map((l, i) => `
      <tr style="background:${i % 2 === 0 ? '#FAFCFB' : '#FFFFFF'}">
        <td style="padding:11px 18px;font-family:Arial,Helvetica,sans-serif;
                   font-size:13px;color:#5A6B5F;border-top:${i === 0 ? 'none' : '1px solid #EBF0ED'};
                   width:200px;white-space:nowrap">${l.libelle}</td>
        <td style="padding:11px 18px;font-family:${l.accentuer ? "'Courier New',Courier,monospace" : 'Arial,Helvetica,sans-serif'};
                   font-size:${l.accentuer ? '14px' : '13px'};
                   color:${l.accentuer ? '#006B3C' : '#0D1F14'};
                   font-weight:${l.accentuer ? '700' : '600'};
                   letter-spacing:${l.accentuer ? '1.5px' : '0'};
                   border-top:${i === 0 ? 'none' : '1px solid #EBF0ED'}">${l.valeur}</td>
      </tr>`).join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border:1px solid #DDE4DF;border-radius:4px;overflow:hidden;margin-bottom:28px">
        ${rangees}
      </table>`;
  }

  /**
   * Bouton CTA institutionnel.
   */
  construireBoutonCta(url: string, texte: string): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0">
        <tr>
          <td style="background:#006B3C;border-radius:3px">
            <a href="${url}"
               style="display:inline-block;padding:13px 32px;
                      font-family:Arial,Helvetica,sans-serif;
                      font-size:14px;font-weight:700;color:#FFF6DD;
                      text-decoration:none;letter-spacing:0.5px;
                      border-radius:3px;line-height:1.2">${texte}</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;
                 font-size:11px;color:#A8B8B0;line-height:1.5">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br/>
        <a href="${url}" style="color:#006B3C;word-break:break-all">${url}</a>
      </p>`;
  }

  /**
   * Bloc d'information contextuel (neutre / avertissement).
   */
  construireBlocInfo(texte: string, type: 'info' | 'alerte' = 'info'): string {
    const bordure = type === 'alerte' ? '#E9AA20' : '#DDE4DF';
    const fond    = type === 'alerte' ? '#FDFAF2' : '#F7FAF8';
    const couleur = type === 'alerte' ? '#7A6418' : '#5A6B5F';
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:20px 0 0">
        <tr>
          <td style="background:${fond};border-left:3px solid ${bordure};
                     padding:12px 16px;border-radius:0 4px 4px 0">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;
                       font-size:12px;color:${couleur};line-height:1.6">${texte}</p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Séparateur horizontal.
   */
  construireSeparateur(): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="margin:24px 0">
              <tr><td style="border-top:1px solid #EBF0ED;height:1px;font-size:0">&nbsp;</td></tr>
            </table>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPLATES SPÉCIFIQUES
  // ─────────────────────────────────────────────────────────────────────────

  private construireContenuOtp(code: string, dureeMinutes: number): { sujet: string; texte: string; html: string } {
    const sujet = 'Code de vérification — SIGAPEI';

    const texte =
      `SIGAPEI — Système Intégré de Gestion Académique\n` +
      `${'─'.repeat(48)}\n\n` +
      `Votre code de vérification : ${code}\n\n` +
      `Ce code est valable ${dureeMinutes} minutes et ne peut être utilisé qu'une seule fois.\n` +
      `Ne le communiquez à personne, y compris au personnel SIGAPEI.\n\n` +
      `Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message.\n\n` +
      `${'─'.repeat(48)}\n` +
      `© ${new Date().getFullYear()} SIGAPEI`;

    const html = this.construireEnveloppeHtml({
      titreCourrier: 'Code de vérification',
      corps: `
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;
                   font-size:14px;color:#3D4F44;line-height:1.6">Bonjour,</p>
        <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;
                   font-size:14px;color:#3D4F44;line-height:1.7">
          Votre demande de connexion à SIGAPEI a été reçue.
          Utilisez le code ci-dessous pour confirmer votre identité.
        </p>
        ${this.construireBlocOtp(code, dureeMinutes)}
        ${this.construireBlocInfo(
          'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message. ' +
          'Votre compte reste sécurisé.',
          'alerte',
        )}`,
    });

    return { sujet, texte, html };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTHODES D'ENVOI
  // ─────────────────────────────────────────────────────────────────────────

  async envoyerCodeOtp(destinataire: string, code: string, dureeMinutes: number): Promise<boolean> {
    const { sujet, texte, html } = this.construireContenuOtp(code, dureeMinutes);
    try {
      await this.transporteur.sendMail({
        from: this.config.get<string>('smtp.from'),
        to: destinataire,
        subject: sujet,
        text: texte,
        html,
      });
      return true;
    } catch (err) {
      this.logger.error(`Échec envoi OTP vers ${destinataire} : ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Envoi générique pour les notifications d'onboarding.
   * Accepte soit `{ titreCourrier, corps }` (HTML partiel injecté dans l'enveloppe),
   * soit `{ html }` brut pour compatibilité.
   */
  async envoyerNotificationOnboarding(
    destinataire: string,
    options: {
      sujet: string;
      html?: string;
      titreCourrier?: string;
      corps?: string;
    },
  ): Promise<boolean> {
    const htmlFinal = options.html ?? this.construireEnveloppeHtml({
      titreCourrier: options.titreCourrier ?? 'Notification',
      corps: options.corps ?? '',
    });
    try {
      await this.transporteur.sendMail({
        from: this.config.get<string>('smtp.from'),
        to: destinataire,
        subject: options.sujet,
        html: htmlFinal,
      });
      return true;
    } catch (err) {
      this.logger.error(`Échec envoi notification vers ${destinataire} : ${(err as Error).message}`);
      return false;
    }
  }
}
