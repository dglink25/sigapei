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
    const sujet = 'Votre code de verification sigapei';
    const texte =
      `Votre code de verification est : ${code}\n\n` +
      `Ce code est valable ${dureeMinutes} minutes et ne peut etre utilise qu'une seule fois.\n` +
      `Ne le communiquez a personne, y compris au personnel sigapei.\n\n` +
      `Vous n'etes pas a l'origine de cette demande ? Ignorez cet e-mail.`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>sigapei</h2>
        <p>Votre code de verification est :</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
        <p>Ce code est valable <strong>${dureeMinutes} minutes</strong> et ne peut etre utilise qu'une seule fois.</p>
        <p style="color:#b91c1c">Ne le communiquez a personne, y compris au personnel sigapei.</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">Vous n'etes pas a l'origine de cette demande ? Ignorez cet e-mail.</p>
      </div>`;
    return { sujet, texte, html };
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
}
