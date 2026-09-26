import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EnvoiSmsResultat {
  succes: boolean;
  emetteur?: string;
  erreur?: string;
}

/**
 * Passerelle SMS "maison" open-source (section 12.3) : aucune plateforme
 * commerciale tierce (type Twilio). Ce provider ne fait que deposer le SMS
 * dans la file d'attente exposee par le logiciel de passerelle
 * (ex: Gammu-SMSD, Kannel) pilotant un pool de boitiers SIM.
 *
 * Le pool d'emetteurs (SMS_GATEWAY_SENDER_POOL) est tourne en round-robin ;
 * en cas d'echec, l'appelant (OtpService) bascule automatiquement vers WhatsApp.
 */
@Injectable()
export class SmsGatewayMaisonProvider {
  private readonly logger = new Logger(SmsGatewayMaisonProvider.name);
  private readonly http: AxiosInstance;
  private compteurRoundRobin = 0;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>('smsGateway.url'),
      timeout: 8_000,
      headers: {
        Authorization: `Bearer ${this.config.get<string>('smsGateway.apiKey')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private prochainEmetteur(): string | undefined {
    const pool = this.config.get<string[]>('smsGateway.senderPool') ?? [];
    if (pool.length === 0) return undefined;
    const emetteur = pool[this.compteurRoundRobin % pool.length];
    this.compteurRoundRobin += 1;
    return emetteur;
  }

  formaterMessageOtp(code: string, dureeMinutes: number): string {
    return `sigapei: votre code est ${code} (valable ${dureeMinutes} min). Ne le partagez jamais.`;
  }

  async envoyerCodeOtp(telephoneE164: string, code: string, dureeMinutes: number): Promise<EnvoiSmsResultat> {
    const emetteur = this.prochainEmetteur();
    try {
      await this.http.post('/messages', {
        from: emetteur,
        to: telephoneE164,
        text: this.formaterMessageOtp(code, dureeMinutes),
      });
      return { succes: true, emetteur };
    } catch (err) {
      const erreur = axios.isAxiosError(err) ? err.message : (err as Error).message;
      this.logger.warn(`Echec envoi SMS via ${emetteur}: ${erreur}`);
      return { succes: false, emetteur, erreur };
    }
  }

  /** Suivi du credit restant par emetteur, pour alerter avant epuisement (section 15). */
  async recupererCreditPool(): Promise<Array<{ emetteur: string; creditRestant: number }>> {
    try {
      const { data } = await this.http.get('/credit');
      return data;
    } catch {
      this.logger.error('Impossible de recuperer le credit du pool SMS');
      return [];
    }
  }
}
