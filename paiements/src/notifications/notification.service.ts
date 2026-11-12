/**
 * Service Notifications
 *
 * Canaux : site (in-app), email (SMTP), SMS (passerelle), WhatsApp (Convessa ou équivalent)
 * Les mêmes fournisseurs que le service Identité pour SMS et WhatsApp.
 *
 * Flux :
 *  - L'événement métier insère dans outbox_evenement
 *  - Le scheduler NotificationScheduler consomme outbox_evenement et crée les notifications dans notification
 *  - Le scheduler NotificationDispatcher envoie les notifications en_attente
 *
 * Règles :
 *  - Aucune mention de SIGAPEI dans les notifications ; uniquement le nom de l'établissement.
 *  - Téléphone toujours masqué dans les logs.
 *  - 3 tentatives avec backoff exponentiel.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

export type Canal = 'site' | 'email' | 'sms' | 'whatsapp';

export interface NotificationPayload {
  etablissementUuid?: string;
  utilisateurUuid?: string;
  canal: Canal;
  evenement: string;
  titre: string;
  corps: string;
  donnees?: Record<string, unknown>;
  destinataireMasque?: string;
  destinataireEmail?: string;
  destinataireTelephone?: string;    // E.164, utilisé pour SMS/WhatsApp
}

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);
  private readonly mailer: nodemailer.Transporter | null = null;
  private readonly smsGatewayUrl: string | undefined;
  private readonly smsGatewayToken: string | undefined;
  private readonly smsFrom: string | undefined;
  private readonly whatsappApiUrl: string | undefined;
  private readonly whatsappApiToken: string | undefined;
  private readonly whatsappFrom: string | undefined;

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
  ) {
    const smtpHost = config.get<string>('smtp.host');
    if (smtpHost) {
      this.mailer = nodemailer.createTransport({
        host: smtpHost,
        port: config.get<number>('smtp.port') ?? 587,
        secure: config.get<boolean>('smtp.secure') ?? false,
        auth: {
          user: config.get<string>('smtp.user'),
          pass: config.get<string>('smtp.password'),
        },
      });
    }
    this.smsGatewayUrl = config.get<string>('sms.gatewayUrl');
    this.smsGatewayToken = config.get<string>('sms.gatewayToken');
    this.smsFrom = config.get<string>('sms.from');
    this.whatsappApiUrl = config.get<string>('whatsapp.apiUrl');
    this.whatsappApiToken = config.get<string>('whatsapp.apiToken');
    this.whatsappFrom = config.get<string>('whatsapp.from');
  }

  /** Crée une notification en base (sera envoyée par le scheduler) */
  async creer(payload: NotificationPayload): Promise<void> {
    await this.ds.query(
      `INSERT INTO "paiement"."notification"
         (etablissement_uuid, utilisateur_uuid, canal, evenement, titre, corps, donnees, destinataire_masque)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [
        payload.etablissementUuid ?? null,
        payload.utilisateurUuid ?? null,
        payload.canal,
        payload.evenement,
        payload.titre,
        payload.corps,
        JSON.stringify(payload.donnees ?? {}),
        payload.destinataireMasque ?? null,
      ],
    );
  }

  /** Envoi immédiat (pour les cas urgents, ex: OTP lien reçu) */
  async envoyerImmediatement(payload: NotificationPayload): Promise<boolean> {
    try {
      switch (payload.canal) {
        case 'email':
          return await this.envoyerEmail(payload.destinataireEmail!, payload.titre, payload.corps);
        case 'sms':
          return await this.envoyerSms(payload.destinataireTelephone!, payload.corps);
        case 'whatsapp':
          return await this.envoyerWhatsapp(payload.destinataireTelephone!, payload.corps);
        default:
          return true; // in-app : toujours succès
      }
    } catch (err: unknown) {
      this.log.error(`Envoi immédiat ${payload.canal} échoué: ${(err as Error).message}`);
      return false;
    }
  }

  /** Traite les notifications en attente (appelé par le scheduler) */
  async traiterNotificationsEnAttente(): Promise<void> {
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT id, canal, titre, corps, donnees, destinataire_masque
         FROM "paiement"."notification"
        WHERE statut = 'en_attente' AND prochaine_tentative <= now() AND tentatives < 3
        ORDER BY created_at ASC LIMIT 50
        FOR UPDATE SKIP LOCKED`,
    );

    for (const notif of rows) {
      let succes = false;
      let erreur: string | null = null;

      try {
        const donnees = notif.donnees as Record<string, unknown>;
        switch (notif.canal as Canal) {
          case 'email':
            if (donnees?.email) {
              succes = await this.envoyerEmail(String(donnees.email), String(notif.titre), String(notif.corps));
            }
            break;
          case 'sms':
            if (donnees?.telephone) {
              succes = await this.envoyerSms(String(donnees.telephone), String(notif.corps));
            }
            break;
          case 'whatsapp':
            if (donnees?.telephone) {
              succes = await this.envoyerWhatsapp(String(donnees.telephone), String(notif.corps));
            }
            break;
          case 'site':
            succes = true; // la notification in-app est déjà en BD, prête à être lue
            break;
        }
      } catch (err: unknown) {
        erreur = (err as Error).message;
      }

      const tentatives = Number(notif.tentatives) + 1;
      if (succes) {
        await this.ds.query(
          `UPDATE "paiement"."notification"
              SET statut = 'envoye', envoye_le = now(), tentatives = $1
            WHERE id = $2`,
          [tentatives, notif.id],
        );
      } else {
        const prochaineTentative = new Date(Date.now() + Math.pow(2, tentatives) * 60_000);
        await this.ds.query(
          `UPDATE "paiement"."notification"
              SET statut = CASE WHEN $1 >= 3 THEN 'echoue' ELSE 'en_attente' END,
                  tentatives = $1, erreur = $2, prochaine_tentative = $3
            WHERE id = $4`,
          [tentatives, erreur, prochaineTentative, notif.id],
        );
      }
    }
  }

  private async envoyerEmail(destinataire: string, sujet: string, corps: string): Promise<boolean> {
    if (!this.mailer) {
      this.log.warn('SMTP non configuré - email non envoyé');
      return false;
    }
    await this.mailer.sendMail({
      from: this.config.get<string>('smtp.from'),
      to: destinataire,
      subject: sujet,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">${corps}</div>`,
      text: corps.replace(/<[^>]+>/g, ''),
    });
    return true;
  }

  private async envoyerSms(telephone: string, message: string): Promise<boolean> {
    if (!this.smsGatewayUrl || !this.smsGatewayToken) {
      this.log.warn('SMS Gateway non configurée');
      return false;
    }
    await axios.post(
      this.smsGatewayUrl,
      { from: this.smsFrom, to: telephone, message },
      { headers: { Authorization: `Bearer ${this.smsGatewayToken}` }, timeout: 15_000 },
    );
    return true;
  }

  private async envoyerWhatsapp(telephone: string, message: string): Promise<boolean> {
    if (!this.whatsappApiUrl || !this.whatsappApiToken) {
      this.log.warn('WhatsApp API non configurée');
      return false;
    }
    await axios.post(
      `${this.whatsappApiUrl}/messages`,
      {
        from: this.whatsappFrom,
        to: telephone,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${this.whatsappApiToken}` }, timeout: 15_000 },
    );
    return true;
  }

  /** Notifications in-app non lues d'un utilisateur */
  async listerNonLues(utilisateurUuid: string, etablissementUuid?: string) {
    return this.ds.query(
      `SELECT uuid, canal, evenement, titre, corps, donnees, created_at
         FROM "paiement"."notification"
        WHERE utilisateur_uuid = $1
          AND ($2::uuid IS NULL OR etablissement_uuid = $2)
          AND statut != 'lu'
          AND canal = 'site'
        ORDER BY created_at DESC LIMIT 50`,
      [utilisateurUuid, etablissementUuid ?? null],
    );
  }

  async marquerLu(notificationUuid: string, utilisateurUuid: string): Promise<void> {
    await this.ds.query(
      `UPDATE "paiement"."notification"
          SET statut = 'lu', lu_le = now()
        WHERE uuid = $1 AND utilisateur_uuid = $2`,
      [notificationUuid, utilisateurUuid],
    );
  }
}
