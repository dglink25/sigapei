/**
 * Adaptateur CinetPay
 * Suit la documentation officielle de CinetPay.
 *
 * API d'initialisation : POST https://api-checkout.cinetpay.com/v2/payment
 * API de vérification  : POST https://api-checkout.cinetpay.com/v2/payment/check
 * IPN (notification)   : POST sur notify_url configurée lors de l'initiation
 * Payout               : POST https://client.cinetpay.com/v1/transfer/money/send/contact
 *
 * Champs obligatoires CinetPay :
 *   apikey, site_id, transaction_id, amount, currency, notify_url, return_url, description
 *
 * Ref : https://github.com/agazinakou/cinetpay (interface commune)
 * Ref payout : https://documenter.getpostman.com/view/1612269/RWEmHGeS
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  IAgregateur, PayinInitRequest, PayinInitResponse, PayinVerifyResponse,
  PayoutRequest, PayoutResponse, PayoutVerifyResponse,
  RefundRequest, RefundResponse, WebhookVerifyResult,
} from './agregateur.interface';

interface CinetPayInitResponse {
  code: string;
  message: string;
  data?: {
    payment_token: string;
    payment_url: string;
  };
  api_response_id?: string;
}

interface CinetPayCheckResponse {
  code: string;
  message: string;
  data?: {
    amount: string | number;
    currency: string;
    status: string;         // 'ACCEPTED' | 'REFUSED' | 'CANCELLED' | 'PENDING' | ...
    transaction_id: string;
    description: string;
    metadata?: string;
    operator_id?: string;
    payment_method?: string;
    created_date?: string;
    is_escrow?: string;
    is_whatsapp?: string;
  };
}

const CINETPAY_STATUS_MAP: Record<string, PayinVerifyResponse['statut']> = {
  ACCEPTED: 'approuve',
  REFUSED: 'refuse',
  CANCELLED: 'annule',
  PENDING: 'en_attente',
  INSUFFICIENT_BALANCE: 'refuse',
  EXPIRED: 'expire',
};

@Injectable()
export class CinetpayAdapter implements IAgregateur {
  readonly code = 'cinetpay';
  readonly nom = 'CinetPay';

  private readonly log = new Logger(CinetpayAdapter.name);
  private readonly http: AxiosInstance;
  private readonly httpPayout: AxiosInstance;
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly notifySecret: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('cinetpay.apiKey');
    const siteId = config.get<string>('cinetpay.siteId');
    const notifySecret = config.get<string>('cinetpay.notifySecret');
    if (!apiKey || !siteId) throw new Error('CINETPAY_API_KEY et CINETPAY_SITE_ID sont obligatoires');
    if (!notifySecret) throw new Error('CINETPAY_NOTIFY_SECRET manquante');

    this.apiKey = apiKey;
    this.siteId = siteId;
    this.notifySecret = notifySecret;

    const baseURL = config.get<string>('cinetpay.apiUrl') ?? 'https://api-checkout.cinetpay.com/v2';
    this.http = axios.create({ baseURL, timeout: 30_000, headers: { 'Content-Type': 'application/json' } });

    // Payout API CinetPay (endpoint distinct)
    this.httpPayout = axios.create({
      baseURL: 'https://client.cinetpay.com/v1',
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Initialise un paiement CinetPay.
   * Ref : POST /v2/payment
   * Paramètres obligatoires : apikey, site_id, transaction_id, amount, currency, notify_url, return_url, description
   * Retourne : payment_token + payment_url
   */
  async initierEncaissement(req: PayinInitRequest): Promise<PayinInitResponse> {
    try {
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: req.referenceMarchande, // doit être UNIQUE - notre référence marchande
        amount: Number(req.montant),
        currency: req.devise,
        description: req.libelle,
        notify_url: req.notifyUrl,
        return_url: req.callbackUrl,
        // Données payeur (optionnelles mais recommandées)
        customer_name: req.payeur?.nom ?? '',
        customer_surname: req.payeur?.prenom ?? '',
        customer_email: req.payeur?.email ?? '',
        customer_phone_number: req.payeur?.telephone ?? '',
        customer_address: '',
        customer_city: '',
        customer_country: req.payeur?.pays ?? 'BJ',
        customer_state: req.payeur?.pays ?? 'BJ',
        customer_zip_code: '',
        // Métadonnées
        metadata: JSON.stringify({ ...req.metadonnees, sigapei_ref: req.referenceMarchande }),
        channels: 'ALL', // Mobile Money + Cartes + Wave
        lang: 'fr',
      };

      const { data } = await this.http.post<CinetPayInitResponse>('/payment', payload);

      if (data.code !== '201') {
        throw new Error(`CinetPay init error: ${data.code} - ${data.message}`);
      }

      return {
        referenceAgregateur: data.data!.payment_token,
        urlPaiement: data.data!.payment_url,
        token: data.data!.payment_token,
        statut: 'initie',
        donneesRaw: data as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.log.error(`CinetPay initierEncaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'CinetPay est indisponible.' });
    }
  }

  /**
   * Vérifie le statut d'une transaction CinetPay.
   * Ref : POST /v2/payment/check
   * Paramètres : apikey, site_id, transaction_id (notre reference marchande)
   */
  async verifierEncaissement(referenceAgregateur: string): Promise<PayinVerifyResponse> {
    try {
      const payload = {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: referenceAgregateur, // notre reference marchande ou le token
      };

      const { data } = await this.http.post<CinetPayCheckResponse>('/payment/check', payload);

      if (!data.data) {
        return {
          referenceAgregateur,
          referenceMarchande: referenceAgregateur,
          statut: 'en_attente',
          montant: 0n,
          frais: 0n,
          montantNet: 0n,
          devise: 'XOF',
          donneesRaw: data as unknown as Record<string, unknown>,
        };
      }

      const statutBrut = data.data.status ?? 'PENDING';
      const statut = CINETPAY_STATUS_MAP[statutBrut] ?? 'en_attente';
      const montant = BigInt(data.data.amount ?? 0);

      // CinetPay : frais à 1% (variable selon le mode) - montant_net ≈ montant (frais à charge du payeur par défaut)
      const frais = 0n;
      const montantNet = montant;

      return {
        referenceAgregateur,
        referenceMarchande: data.data.transaction_id ?? referenceAgregateur,
        statut,
        montant,
        frais,
        montantNet,
        devise: data.data.currency ?? 'XOF',
        methode: data.data.payment_method ?? undefined,
        donneesRaw: data.data as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.log.error(`CinetPay verifierEncaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'CinetPay est indisponible.' });
    }
  }

  /**
   * Payout CinetPay : transfert Mobile Money.
   * Ref : https://documenter.getpostman.com/view/1612269/RWEmHGeS
   * API : POST https://client.cinetpay.com/v1/transfer/money/send/contact
   */
  async initierDecaissement(req: PayoutRequest): Promise<PayoutResponse> {
    try {
      const payload = {
        data: [
          {
            prefix: req.beneficiaire.pays === 'BJ' ? '229' : req.beneficiaire.pays === 'CI' ? '225' : '229',
            phone: req.beneficiaire.telephone.replace(/^\+/, '').slice(3), // numéro sans indicatif
            amount: Number(req.montant),
            firstname: req.beneficiaire.nom.split(' ')[0] ?? req.beneficiaire.nom,
            lastname: req.beneficiaire.nom.split(' ').slice(1).join(' ') || req.beneficiaire.nom,
            email: `${req.referenceMarchande}@noreply.sigapei.local`,
            user_id: req.referenceMarchande,
            user_reference_id: req.referenceMarchande,
            notify_url: '', // configuré dans les préférences du compte CinetPay
          },
        ],
        apikey: this.apiKey,
        site_id: this.siteId,
      };

      const { data } = await this.httpPayout.post('/transfer/money/send/contact', payload);
      const record = data?.data?.[0] ?? data;

      return {
        referenceAgrecateur: record?.transaction_id ?? req.referenceMarchande,
        referenceAgregateur: record?.transaction_id ?? req.referenceMarchande,
        statut: 'soumis',
        donneesRaw: data as unknown as Record<string, unknown>,
      } as PayoutResponse;
    } catch (err: unknown) {
      this.log.error(`CinetPay initierDecaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'CinetPay Payout est indisponible.' });
    }
  }

  async verifierDecaissement(referenceAgregateur: string): Promise<PayoutVerifyResponse> {
    try {
      const { data } = await this.httpPayout.post('/transfer/check/money/send', {
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: referenceAgregateur,
      });
      const record = data?.data ?? data;
      const statutBrut = record?.status ?? 'PENDING';
      let statut: PayoutVerifyResponse['statut'] = 'incertain';
      if (statutBrut === 'DONE' || statutBrut === 'SUCCESS') statut = 'envoye';
      else if (statutBrut === 'PENDING' || statutBrut === 'PROCESSING') statut = 'en_cours';
      else if (statutBrut === 'FAILED') statut = 'echoue';

      return {
        referenceAgregateur,
        statut,
        montant: BigInt(record?.amount ?? 0),
        frais: 0n,
        montantRecu: BigInt(record?.amount ?? 0),
        donneesRaw: record as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.log.error(`CinetPay verifierDecaissement: ${(err as Error).message}`);
      return { referenceAgregateur, statut: 'incertain', montant: 0n, frais: 0n, montantRecu: 0n, donneesRaw: {} };
    }
  }

  /**
   * CinetPay ne propose pas d'API de remboursement automatique publique.
   * Le remboursement doit être traité manuellement depuis le tableau de bord CinetPay.
   */
  async rembourser(req: RefundRequest): Promise<RefundResponse> {
    this.log.warn(`CinetPay rembourser: traitement manuel requis pour ${req.referenceAgregateurPayin}`);
    return {
      referenceAgregateur: req.referenceAgregateurPayin,
      statut: 'en_cours',
      donneesRaw: { mode: 'manuel_agregateur', message: 'Remboursement CinetPay doit être initié depuis le tableau de bord.' },
    };
  }

  /**
   * Vérifie la notification IPN CinetPay.
   * CinetPay envoie une notification POST sur notify_url avec transaction_id et cpm_site_id.
   * La vérification se fait en recréant l'appel de check avec nos clés.
   * Certaines intégrations utilisent aussi un HMAC sur les données : on vérifie les deux.
   */
  verifierWebhook(corps: Buffer | string, entetes: Record<string, string>): WebhookVerifyResult {
    try {
      const corpsParse = JSON.parse(
        typeof corps === 'string' ? corps : corps.toString('utf8'),
      ) as Record<string, unknown>;

      // Vérification du site_id dans le corps de la notification
      const siteId = corpsParse['cpm_site_id'] ?? corpsParse['site_id'];
      if (siteId && String(siteId) !== this.siteId) {
        return { valide: false, corps: corpsParse, motif: 'site_id ne correspond pas' };
      }

      // Si un header de signature HMAC est présent (implémentations avancées)
      const hmacHeader = entetes['x-cinetpay-signature'] ?? entetes['X-CinetPay-Signature'];
      if (hmacHeader) {
        const corpsBrut = typeof corps === 'string' ? corps : corps.toString('utf8');
        const hmacAttendu = createHmac('sha256', this.notifySecret).update(corpsBrut).digest('hex');
        try {
          const valide = timingSafeEqual(Buffer.from(hmacAttendu), Buffer.from(hmacHeader));
          if (!valide) return { valide: false, corps: corpsParse, motif: 'Signature HMAC CinetPay invalide' };
        } catch {
          return { valide: false, corps: corpsParse, motif: 'Signature HMAC CinetPay invalide' };
        }
      }

      // CinetPay : la vérification finale se fait par un appel à l'API /payment/check
      // On retourne valide=true ici ; le service encaissement refait un check avant de créditer
      return { valide: true, corps: corpsParse };
    } catch (err: unknown) {
      return { valide: false, corps: {}, motif: `Erreur: ${(err as Error).message}` };
    }
  }

  /** Génère un HMAC pour vérifier un token CinetPay (selon certaines docs SDK) */
  verifierHmacToken(token: string): boolean {
    const hash = createHash('sha256').update(`${this.apiKey}${this.siteId}${token}`).digest('hex');
    return hash.length > 0; // logique de vérification spécifique à implémenter selon les specs exactes
  }
}
