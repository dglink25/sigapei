import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envoi d'e-mails transactionnels (OTP) via un compte SMTP applicatif
 * authentifie par mot de passe d'application (section 12.3), sans
 * dependance a un fournisseur transactionnel tiers payant.
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
      this.logger.log('Connexion SMTP verifiee');
    } catch (err) {
      this.logger.warn(`SMTP indisponible pour le moment: ${(err as Error).message}`);
    }
  }

  private construireContenuOtp(code: string, dureeMinutes: number) {
    const sujet = 'SIGAPEI - Votre code de vérification';
    const texte =
      `SIGAPEI\n\n` +
      `Votre code de vérification est : ${code}\n\n` +
      `Ce code est valable ${dureeMinutes} minutes et ne peut être utilisé qu'une seule fois.\n` +
      `Ne le communiquez à personne, y compris au personnel SIGAPEI.\n\n` +
      `Vous n'êtes pas à l'origine de cette demande ? Ignorez cet e-mail.\n\n` +
      `SIGAPEI - Plateforme E-Académique`;

    const html = this.construireEnveloppeHtml({
      titreCourrier: 'Code de vérification',
      corps: `
        <p style="margin:0 0 20px;color:#5a6b5f;font-size:14px">Bonjour,</p>
        <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
          Vous avez demandé un code de vérification pour accéder à votre compte SIGAPEI.
        </p>
        <p style="margin:0 0 8px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Votre code</p>
        <p style="margin:0 0 24px">
          <span style="display:inline-block;font-family:'Century Gothic','Poppins',monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#006B3C;background:#f7faf8;border:1px solid #dde4df;border-radius:10px;padding:16px 32px">
            ${code}
          </span>
        </p>
        <p style="margin:0 0 28px;color:#1a2a1e;font-size:14px;line-height:1.6">
          Ce code est valable <strong>${dureeMinutes} minutes</strong> et ne peut être utilisé qu'une seule fois.
        </p>
        ${this.construireAvertissementSecurite()}
      `,
    });
    return { sujet, texte, html };
  }

  // ─── Templates HTML institutionnels partagés ─────────────────────────────

  /**
   * Enveloppe HTML institutionnelle SIGAPEI : en-tête vert, corps, pied de page.
   * Toute notification e-mail doit passer par cette méthode pour garantir une
   * charte graphique uniforme.
   */
  construireEnveloppeHtml({ titreCourrier, corps }: { titreCourrier: string; corps: string }): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:'Century Gothic','Questrial','Poppins',system-ui,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5">
    <tr><td align="center" style="padding:24px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">

        <!-- En-tête -->
        <tr>
          <td style="background:#006B3C;padding:28px 40px 24px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:24px;font-weight:700;color:#FFF6DD;letter-spacing:2px">SIGAPEI</p>
                  <p style="margin:4px 0 0;font-size:12px;color:rgba(255,246,221,0.75);letter-spacing:0.5px">Plateforme E-Académique</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bande dorée -->
        <tr>
          <td style="background:#E9AA20;height:4px;line-height:4px;font-size:4px">&nbsp;</td>
        </tr>

        <!-- Titre du courrier -->
        <tr>
          <td style="padding:32px 40px 0">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a2a1e;letter-spacing:0.3px">${titreCourrier}</h1>
            <div style="width:48px;height:3px;background:#006B3C;border-radius:2px;margin-bottom:24px"></div>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:0 40px 32px">
            ${corps}
          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="background:#f7faf8;border-top:1px solid #dde4df;padding:20px 40px 24px">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#006B3C;letter-spacing:1px">SIGAPEI</p>
            <p style="margin:0 0 8px;font-size:12px;color:#8a9e92">Plateforme E-Académique</p>
            <p style="margin:0;font-size:11px;color:#8a9e92;line-height:1.5">
              Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /** Bloc d'avertissement de sécurité (ne pas partager le code). */
  private construireAvertissementSecurite(): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:#fef9ef;border:1px solid #f5e0b3;border-radius:8px">
        <tr>
          <td style="padding:14px 18px">
            <p style="margin:0;font-size:13px;color:#92702a;line-height:1.5">
              <strong>Important :</strong> Ne communiquez jamais ce code à personne,
              y compris au personnel SIGAPEI. Aucune demande légitime ne vous demandera
              de le transmettre.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#8a9e92;font-size:12px">Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail.</p>`;
  }

  /** Bouton d'action CTA (Call To Action) institutionnel. */
  construireBoutonCta(url: string, texte: string): string {
    return `
      <p style="margin:24px 0">
        <a href="${url}"
           style="display:inline-block;padding:14px 32px;background:#006B3C;color:#FFF6DD;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px">
          ${texte}
        </a>
      </p>`;
  }

  /** Séparateur horizontal discret. */
  construireSeparateur(): string {
    return `<hr style="border:none;border-top:1px solid #dde4df;margin:24px 0" />`;
  }

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
      this.logger.error(`Echec envoi e-mail OTP vers ${destinataire}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Envoi générique pour les notifications d'onboarding (demande soumise, correction…).
   * Accepte un `titreCourrier` et un `corps` HTML qui seront enveloppés dans le
   * template institutionnel SIGAPEI, ou un `html` brut pour compatibilité.
   */
  async envoyerNotificationOnboarding(
    destinataire: string,
    { sujet, html, titreCourrier, corps }: {
      sujet: string;
      html?: string;
      titreCourrier?: string;
      corps?: string;
    },
  ): Promise<boolean> {
    const htmlFinal = html ?? this.construireEnveloppeHtml({
      titreCourrier: titreCourrier ?? 'Notification',
      corps: corps ?? '',
    });
    try {
      await this.transporteur.sendMail({
        from: this.config.get<string>('smtp.from'),
        to: destinataire,
        subject: sujet,
        html: htmlFinal,
      });
      return true;
    } catch (err) {
      this.logger.error(`Echec envoi e-mail notification vers ${destinataire}: ${(err as Error).message}`);
      return false;
    }
  }
}
