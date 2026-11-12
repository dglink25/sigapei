/**
 * Adaptateur FedaPay
 * Suit la documentation officielle : https://fedapay.mintlify.app/fr/integration-api/
 *
 * Encaissement : POST /v1/transactions -> GET token -> redirect ou paiement direct
 * Décaissement : POST /v1/payouts -> PUT /v1/payouts/start
 * Webhook : vérification via X-FEDAPAY-SIGNATURE (Webhook.constructEvent)
 * Remboursement : via l'API (refund)
 *
 * Délai de disponibilité FedaPay : encaissement Mobile Money = same day,
 * carte de crédit = jusqu'à 72h. Le service Paiement gère cela via le délai de règlement.
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  IAgregateur, PayinInitRequest, PayinInitResponse, PayinVerifyResponse,
  PayoutRequest, PayoutResponse, PayoutVerifyResponse,
  RefundRequest, RefundResponse, WebhookVerifyResult,
} from './agregateur.interface';

const FEDAPAY_STATUS_MAP: Record<string, PayinVerifyResponse['statut']> = {
  pending: 'en_attente',
  approved: 'approuve',
  declined: 'refuse',
  canceled: 'annule',
  refunded: 'approuve',
  transferred: 'approuve',
  expired: 'expire',
};

const FEDAPAY_PAYOUT_STATUS_MAP: Record<string, PayoutVerifyResponse['statut']> = {
  pending: 'en_attente',
  started: 'soumis',
  processing: 'en_cours',
  sent: 'envoye',
  failed: 'echoue',
};

@Injectable()
export class FedapayAdapter implements IAgregateur {
  readonly code = 'fedapay';
  readonly nom = 'FedaPay';

  private readonly log = new Logger(FedapayAdapter.name);
  private readonly http: AxiosInstance;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const secretKey = config.get<string>('fedapay.secretKey');
    const webhookSecret = config.get<string>('fedapay.webhookSecret');
    if (!secretKey) throw new Error('FEDAPAY_SECRET_KEY manquante');
    if (!webhookSecret) throw new Error('FEDAPAY_WEBHOOK_SECRET manquante');

    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;

    const baseURL = config.get<string>('fedapay.apiUrl') ?? 'https://api.fedapay.com';
    this.http = axios.create({
      baseURL: `${baseURL}/v1`,
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initierEncaissement(req: PayinInitRequest): Promise<PayinInitResponse> {
    try {
      // Étape 1 : créer la transaction
      const payload: Record<string, unknown> = {
        description: req.libelle,
        amount: Number(req.montant),
        currency: { iso: req.devise },
        callback_url: req.callbackUrl,
        merchant_reference: req.referenceMarchande,
      };
      if (req.metadonnees && Object.keys(req.metadonnees).length > 0) {
        payload.custom_metadata = req.metadonnees;
      }
      if (req.payeur?.email) {
        payload.customer = {
          firstname: req.payeur.prenom ?? '',
          lastname: req.payeur.nom ?? '',
          email: req.payeur.email,
          ...(req.payeur.telephone ? {
            phone_number: { number: req.payeur.telephone, country: (req.payeur.pays ?? 'BJ').toLowerCase() },
          } : {}),
        };
      }

      const { data: txData } = await this.http.post('/transactions', payload);
      const tx = txData?.v1?.transaction ?? txData;
      const txId: number = tx?.id;

      // Étape 2 : générer le token de paiement
      const { data: tokenData } = await this.http.post(`/transactions/${txId}/token`);
      const token: string = tokenData?.token ?? tokenData?.v1?.token ?? '';
      const urlPaiement: string = tokenData?.url ?? `https://checkout.fedapay.com/${token}`;

      return {
        referenceAgregateur: String(txId),
        urlPaiement,
        token,
        statut: 'initie',
        donneesRaw: { transaction: tx, tokenData },
      };
    } catch (err: unknown) {
      this.log.error(`FedaPay initierEncaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'FedaPay est indisponible.' });
    }
  }

  async verifierEncaissement(referenceAgregateur: string): Promise<PayinVerifyResponse> {
    try {
      const { data } = await this.http.get(`/transactions/${referenceAgregateur}`);
      const tx = data?.v1?.transaction ?? data;

      const statutBrut: string = tx?.status ?? 'pending';
      const statut = FEDAPAY_STATUS_MAP[statutBrut] ?? 'en_attente';

      const montant = BigInt(tx?.amount ?? 0);
      // FedaPay : frais retirés côté agrégateur. montant_net = amount
      const frais = 0n;
      const montantNet = montant;

      return {
        referenceAgregateur,
        referenceMarchande: tx?.merchant_reference ?? '',
        statut,
        montant,
        frais,
        montantNet,
        devise: tx?.currency?.iso ?? 'XOF',
        methode: tx?.mode ?? undefined,
        approuveLe: tx?.approved_at ? new Date(tx.approved_at) : undefined,
        donneesRaw: tx,
      };
    } catch (err: unknown) {
      this.log.error(`FedaPay verifierEncaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'FedaPay est indisponible.' });
    }
  }

  async initierDecaissement(req: PayoutRequest): Promise<PayoutResponse> {
    try {
      // Étape 1 : créer le dépôt (payout)
      const payload: Record<string, unknown> = {
        amount: Number(req.montant),
        currency: { iso: req.devise },
        description: req.description,
        merchant_reference: req.referenceMarchande,
        customer: {
          firstname: req.beneficiaire.nom.split(' ')[1] ?? '',
          lastname: req.beneficiaire.nom.split(' ')[0] ?? req.beneficiaire.nom,
          email: `${req.referenceMarchande}@noreply.sigapei.local`,
          phone_number: {
            number: req.beneficiaire.telephone,
            country: req.beneficiaire.pays.toLowerCase(),
          },
        },
      };
      if (req.metadonnees && Object.keys(req.metadonnees).length > 0) {
        payload.custom_metadata = req.metadonnees;
      }

      const { data: payoutData } = await this.http.post('/payouts', payload);
      const payout = payoutData?.v1?.payout ?? payoutData;
      const payoutId: number = payout?.id;

      // Étape 2 : démarrer l'envoi
      const startPayload: Record<string, unknown> = {
        payouts: [
          req.planifieLe
            ? { id: payoutId, scheduled_at: req.planifieLe.toISOString() }
            : { id: payoutId, phone_number: { number: req.beneficiaire.telephone, country: req.beneficiaire.pays.toLowerCase() } },
        ],
      };
      await this.http.put('/payouts/start', startPayload);

      return {
        referenceAgregateur: String(payoutId),
        statut: 'soumis',
        donneesRaw: payout,
      };
    } catch (err: unknown) {
      this.log.error(`FedaPay initierDecaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'FedaPay est indisponible.' });
    }
  }

  async verifierDecaissement(referenceAgregateur: string): Promise<PayoutVerifyResponse> {
    try {
      const { data } = await this.http.get(`/payouts/${referenceAgregateur}`);
      const payout = data?.v1?.payout ?? data;

      const statutBrut: string = payout?.status ?? 'pending';
      const statut = FEDAPAY_PAYOUT_STATUS_MAP[statutBrut] ?? 'incertain';
      const montant = BigInt(payout?.amount ?? 0);

      return {
        referenceAgregateur,
        statut,
        montant,
        frais: 0n,
        montantRecu: montant,
        donneesRaw: payout,
      };
    } catch (err: unknown) {
      this.log.error(`FedaPay verifierDecaissement: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'FedaPay est indisponible.' });
    }
  }

  async rembourser(req: RefundRequest): Promise<RefundResponse> {
    // FedaPay ne propose pas encore d'API de remboursement automatique dans la v1 publique.
    // On logue la demande et on retourne un statut manuel_agregateur.
    this.log.warn(`FedaPay rembourser: traitement manuel requis pour ${req.referenceAgregateurPayin}`);
    return {
      referenceAgregateur: req.referenceAgregateurPayin,
      statut: 'en_cours',
      donneesRaw: { mode: 'manuel_agregateur', message: 'Remboursement FedaPay doit être initié depuis le tableau de bord.' },
    };
  }

  /**
   * Vérifie la signature du webhook FedaPay.
   * FedaPay signe via l'en-tête X-FEDAPAY-SIGNATURE avec HMAC-SHA256 + horodatage.
   * Ref : https://fedapay.mintlify.app/fr/integration-api/webhooks
   */
  verifierWebhook(corps: Buffer | string, entetes: Record<string, string>): WebhookVerifyResult {
    try {
      const signature = entetes['x-fedapay-signature'] ?? entetes['X-FEDAPAY-SIGNATURE'] ?? '';
      if (!signature) return { valide: false, corps: {}, motif: 'En-tête X-FEDAPAY-SIGNATURE absent' };

      // Format : "t=<timestamp>,v1=<hmac>"
      const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=')));
      const timestamp = parts['t'];
      const hmacRecu = parts['v1'];
      if (!timestamp || !hmacRecu) return { valide: false, corps: {}, motif: 'Format de signature invalide' };

      // Vérification fraîcheur : rejeter les webhooks de plus de 5 minutes
      const ageSeconds = (Date.now() / 1000) - Number(timestamp);
      if (ageSeconds > 300) return { valide: false, corps: {}, motif: 'Webhook expiré (> 5 min)' };

      const payload = `${timestamp}.${typeof corps === 'string' ? corps : corps.toString('utf8')}`;
      const hmacAttendu = createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
      const valide = timingSafeEqual(Buffer.from(hmacAttendu), Buffer.from(hmacRecu));

      if (!valide) return { valide: false, corps: {}, motif: 'Signature HMAC invalide' };

      const corpsParse = JSON.parse(typeof corps === 'string' ? corps : corps.toString('utf8')) as Record<string, unknown>;
      return { valide: true, corps: corpsParse };
    } catch (err: unknown) {
      return { valide: false, corps: {}, motif: `Erreur de vérification: ${(err as Error).message}` };
    }
  }
}
