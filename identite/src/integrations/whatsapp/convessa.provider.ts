import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EnvoiWhatsappResultat {
  succes: boolean;
  messageId?: string;
  erreur?: string;
}

@Injectable()
export class ConvessaProvider implements OnModuleInit {
  private readonly logger = new Logger(ConvessaProvider.name);
  private readonly http: AxiosInstance;

  /** UUID Convessa du groupe de supervision (résolu depuis le JID au démarrage). */
  private groupeSupervisionUuid: string | null = null;

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

  // ─── Initialisation : résolution de l'UUID groupe ──────────────────────

  async onModuleInit() {
    const valeur = this.config.get<string>('convessa.groupeOtpSuperAdmin');
    if (!valeur) {
      this.logger.warn('CONVESSA_GROUPE_OTP_SUPER_ADMIN non défini - copie groupe super admin désactivée');
      return;
    }

    // Si c'est déjà un UUID Convessa (format UUID v4), l'utiliser directement
    const estUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valeur);
    if (estUuid) {
      this.groupeSupervisionUuid = valeur;
      this.logger.log(`Groupe supervision OTP configuré : ${valeur}`);
      return;
    }

    // Sinon c'est un JID (@g.us) → résoudre via l'API
    try {
      this.groupeSupervisionUuid = await this.resoudreUuidGroupe(valeur);
      if (this.groupeSupervisionUuid) {
        this.logger.log(`Groupe supervision OTP résolu : ${this.groupeSupervisionUuid}`);
      } else {
        this.logger.warn(`Groupe JID ${valeur} introuvable dans Convessa - copie groupe désactivée`);
      }
    } catch (err) {
      this.logger.warn(`Impossible de résoudre le groupe de supervision: ${(err as Error).message}`);
    }
  }

  /**
   * Récupère la liste des groupes depuis Convessa et retourne l'UUID
   * correspondant au JID donné (ex: 120363412615175574@g.us).
   */
  private async resoudreUuidGroupe(jid: string): Promise<string | null> {
    try {
      const { data } = await this.http.get('/api/v1/groups');

      // Log brut pour diagnostic
      this.logger.debug(`Réponse GET /api/v1/groups : ${JSON.stringify(data)}`);

      const groupes: Array<{ groupId: string; id?: string; jid?: string; name?: string }> =
        data?.groups ?? data?.data ?? (Array.isArray(data) ? data : []);

      this.logger.log(`${groupes.length} groupe(s) trouvé(s) dans Convessa : ${groupes.map(g => `${g.name ?? '?'} (groupId=${g.groupId})`).join(' | ')}`);

      const idNumerique = jid.replace('@g.us', '');
      const groupe = groupes.find(
        (g) =>
          g.groupId === jid ||
          g.groupId === idNumerique ||
          g.id === jid ||
          g.id === idNumerique ||
          g.jid === jid,
      );
      // Convessa utilise groupId comme identifiant d'envoi
      return groupe?.groupId ?? groupe?.id ?? null;
    } catch (err) {
      this.logger.warn(`Échec récupération groupes Convessa: ${(err as Error).message}`);
      return null;
    }
  }

  // ─── Formatage des messages ───────────────────────────────────────────────

  formaterMessageOtp(code: string, dureeMinutes: number): string {
    return (
      `*SIGAPEI - Code de vérification*\n\n` +
      `${code}\n\n` +
      `Valable ${dureeMinutes} minutes - usage unique.\n` +
      `Ne communiquez ce code à personne, y compris au personnel SIGAPEI.\n\n` +
      `Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message.\n\n` +
      `SIGAPEI - Plateforme E-Académique`
    );
  }

  formaterMessageAlerteConnexion(appareil: string, dateHeure: string, ville?: string): string {
    return (
      `*SIGAPEI - Nouvelle connexion détectée*\n\n` +
      `Un accès à votre compte a eu lieu depuis un nouvel appareil :\n` +
      `Appareil : ${appareil}\n` +
      `Date : ${dateHeure}${ville ? `\nLocalisation approximative : ${ville}` : ''}\n\n` +
      `Ce n'est pas vous ? Connectez-vous et révoquez cet appareil depuis « Vos appareils connectés ».`
    );
  }

  // ─── Envoi (numéro individuel ou groupe) ─────────────────────────────────

  /**
   * Envoie un message WhatsApp via POST /api/v1/send.
   * - Numéro individuel : to = "229xxxxxxxxx" (sans le +)
   * - Groupe            : to = UUID Convessa du groupe
   */
  async envoyerMessage(destinataire: string, message: string): Promise<EnvoiWhatsappResultat> {
    // Numéro E.164 → retirer le +
    const to = destinataire.startsWith('+') ? destinataire.replace('+', '') : destinataire;

    if (!this.config.get<string>('convessa.apiUrl')) {
      this.logger.log(`[WhatsApp Simulation] Vers ${to} : ${message}`);
      return { succes: true };
    }

    try {
      const { data } = await this.http.post('/api/v1/send', { to, message });
      return { succes: true, messageId: data?.messageId };
    } catch (err) {
      const erreur = axios.isAxiosError(err)
        ? err.response?.data?.error?.message ?? err.message
        : (err as Error).message;
      this.logger.warn(`Échec envoi WhatsApp Convessa vers ${to}: ${erreur}`);
      return { succes: false, erreur };
    }
  }

 
  async envoyerCodeOtp(
    telephoneE164: string,
    code: string,
    dureeMinutes: number,
    roleCode?: string,
    nomComplet?: string,
  ): Promise<EnvoiWhatsappResultat> {
    const message = this.formaterMessageOtp(code, dureeMinutes);
    const resultat = await this.envoyerMessage(telephoneE164, message);

    if (roleCode === 'super_admin') {
      if (this.groupeSupervisionUuid) {
        const messageGroupe =
          `*OTP Super Admin*\n` +
          `Tentative de connexion en cours au compte de : *${nomComplet}*\n\n` +
          message;
        await this.envoyerMessage(this.groupeSupervisionUuid, messageGroupe).catch((e) =>
          this.logger.warn(`Échec copie groupe supervision: ${(e as Error).message}`),
        );
      } else {
        this.logger.warn('Groupe supervision non résolu - copie ignorée pour ce super admin');
      }
    }

    return resultat;
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

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
    } catch {
      throw new HttpException('Statut Convessa indisponible', 502);
    }
  }
}
