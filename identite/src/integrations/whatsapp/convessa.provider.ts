import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EnvoiWhatsappResultat {
  succes: boolean;
  messageId?: string;
  erreur?: string;
}

/**
 * Integration WhatsApp via le prestataire Convessa
 * (https://convessa.epac-uac-optica-chapter.bj), conformement a la section 12.3
 * du cahier des charges. Un seul header requis : X-Api-Key.
 */
@Injectable()
export class ConvessaProvider {
  private readonly logger = new Logger(ConvessaProvider.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>('convessa.apiUrl'),
      timeout: 10_000,
      headers: {
        'X-Api-Key': this.config.get<string>('convessa.apiKey'),
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Format standard du message OTP WhatsApp sigapei.
   *
   * Regles de format retenues :
   *  - 1re ligne : identite claire de l'emetteur (evite la confusion avec du phishing) ;
   *  - code isole sur sa propre ligne, jamais noye dans une phrase (facilite la copie/l'auto-remplissage) ;
   *  - duree de validite explicite ;
   *  - avertissement anti-hameconnage systematique (jamais partager le code) ;
   *  - pas d'URL, pas de piece jointe : uniquement du texte brut, pour rester conforme
   *    aux gabarits WhatsApp "utility" et eviter tout blocage anti-spam.
   */
  formaterMessageOtp(code: string, dureeMinutes: number): string {
    return (
      `sigapei - Code de verification\n\n` +
      `${code}\n\n` +
      `Ce code est valable ${dureeMinutes} minutes et ne peut etre utilise qu'une seule fois.\n` +
      `Ne le communiquez a personne, y compris au personnel sigapei.\n\n` +
      `Vous n'etes pas a l'origine de cette demande ? Ignorez simplement ce message.`
    );
  }

  formaterMessageAlerteConnexion(appareil: string, dateHeure: string, ville?: string): string {
    return (
      `sigapei - Nouvelle connexion detectee\n\n` +
      `Un acces a votre compte a eu lieu depuis un nouvel appareil :\n` +
      `Appareil : ${appareil}\n` +
      `Date : ${dateHeure}${ville ? `\nLocalisation approximative : ${ville}` : ''}\n\n` +
      `Ce n'est pas vous ? Connectez-vous et revoquez cet appareil depuis "Vos appareils connectes".`
    );
  }

  async envoyerMessage(telephoneE164: string, message: string): Promise<EnvoiWhatsappResultat> {
    const numero = telephoneE164.replace('+', '');
    try {
      const { data } = await this.http.post('/api/v1/send', {
        to: numero,
        message,
      });
      return { succes: true, messageId: data?.messageId };
    } catch (err) {
      const erreur = axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : (err as Error).message;
      this.logger.warn(`Echec envoi WhatsApp Convessa vers ${numero}: ${erreur}`);
      return { succes: false, erreur };
    }
  }

  async envoyerCodeOtp(telephoneE164: string, code: string, dureeMinutes: number): Promise<EnvoiWhatsappResultat> {
    return this.envoyerMessage(telephoneE164, this.formaterMessageOtp(code, dureeMinutes));
  }

  async verifierSession(): Promise<boolean> {
    try {
      const { data } = await this.http.get('/api/v1/send/info');
      return !!data?.connected;
    } catch (err) {
      this.logger.error(`Session Convessa indisponible: ${(err as Error).message}`);
      return false;
    }
  }

  async recupererStatut(messageId: string) {
    try {
      const { data } = await this.http.get(`/api/v1/send/status/${messageId}`);
      return data;
    } catch (err) {
      throw new HttpException('Statut Convessa indisponible', 502);
    }
  }
}
