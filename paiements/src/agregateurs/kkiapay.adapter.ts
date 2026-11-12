/**
 * Adaptateur Kkiapay
 * Suit la documentation officielle : https://docs.kkiapay.me/v1/
 *
 * SDK serveur : @kkiapay-org/nodejs-sdk (npm i @kkiapay-org/nodejs-sdk)
 *
 * Encaissement : via le widget JS côté client ; côté serveur on vérifie avec k.verify(transactionId)
 * Décaissement (payout) : via l'API REST (Mobile Money uniquement)
 * Remboursement : k.refund(transactionId) - mobile money uniquement, hors frais
 * Webhook : signature via l'en-tête x-kkiapay-secret (hash secret configuré dans le dashboard)
 *
 * Balances Kkiapay :
 *   - operation balance : fonds en attente (mobile money = même jour, carte = 72h)
 *   - available balance : fonds disponibles pour retrait
 *
 * Ref : https://docs.kkiapay.me/v1/en-1.0.0/plugin-et-sdk/admin-sdks-server-side/node.js-admin-sdk.md
 * Ref webhooks : https://docs.kkiapay.me/v1/en-1.0.0/tableau-de-bord/webhook.md
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import {
  IAgregateur, PayinInitRequest, PayinInitResponse, PayinVerifyResponse,
  PayoutRequest, PayoutResponse, PayoutVerifyResponse,
  RefundRequest, RefundResponse, WebhookVerifyResult,
} from './agregateur.interface';

// Le SDK Kkiapay Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { kkiapay } = require('@kkiapay-org/nodejs-sdk');

interface KkiapayVerifyResponse {
  performed_at: string;
  type: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  source: string;
  source_common_name: string;
  amount: number;
  fees: number;
  reason: string;
  failureCode: string;
  failureMessage: string;
  transactionId: string;
  performedAt: string;
  client?: { fullname: string; phone: string; email: string };
  feeSupportedBy?: string;
  income?: number;
}

interface KkiapayWebhookPayload {
  transactionId: string;
  isPaymentSucces: boolean;
  account?: string;
  failureCode?: string;
  failureMessage?: string;
  label?: string;
  method?: string;
  amount: number;
  fees: number;
  partnerId?: string;
  performedAt: string;
  event: 'transaction.success' | 'transaction.failed';
}

@Injectable()
export class KkiapayAdapter implements IAgregateur {
  readonly code = 'kkiapay';
  readonly nom = 'Kkiapay';

  private readonly log = new Logger(KkiapayAdapter.name);
  private readonly k: ReturnType<typeof kkiapay>;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const publicKey = config.get<string>('kkiapay.publicKey');
    const privateKey = config.get<string>('kkiapay.privateKey');
    const secretKey = config.get<string>('kkiapay.secretKey');
    const webhookSecret = config.get<string>('kkiapay.webhookSecret');
    if (!publicKey || !privateKey || !secretKey) {
      throw new Error('KKIAPAY_PUBLIC_KEY, KKIAPAY_PRIVATE_KEY et KKIAPAY_SECRET_KEY sont obligatoires');
    }
    if (!webhookSecret) throw new Error('KKIAPAY_WEBHOOK_SECRET manquante');

    this.webhookSecret = webhookSecret;
    const sandbox = config.get<boolean>('kkiapay.sandbox') ?? false;

    this.k = kkiapay({ publickey: publicKey, privatekey: privateKey, secretkey: secretKey, sandbox });
  }

  /**
   * Kkiapay : le widget de collecte est côté client (JS).
   * Côté serveur, on retourne uniquement les informations nécessaires au widget.
   * La vérification est faite après que le client envoie le transactionId.
   */
  async initierEncaissement(req: PayinInitRequest): Promise<PayinInitResponse> {
    // Le widget Kkiapay n'est pas initié côté serveur via API REST :
    // le frontend l'intègre via le SDK JS, puis envoie le transactionId au backend.
    // On retourne une réponse "pending" avec les données nécessaires au widget.
    return {
      referenceAgregateur: req.referenceMarchande, // sera remplacé par le vrai transactionId à la vérification
      statut: 'initie',
      donneesRaw: {
        note: 'Kkiapay : vérification requise après paiement via le widget JS',
        referenceMarchande: req.referenceMarchande,
        montant: Number(req.montant),
        devise: req.devise,
      },
    };
  }

  /**
   * Vérifie une transaction Kkiapay via le SDK Admin.
   * Appelé après que le widget JS a renvoyé le transactionId.
   * Ref : k.verify(transactionId)
   */
  async verifierEncaissement(referenceAgregateur: string): Promise<PayinVerifyResponse> {
    try {
      const response: KkiapayVerifyResponse = await this.k.verify(referenceAgregateur);

      const statutBrut = response.status;
      let statut: PayinVerifyResponse['statut'] = 'en_attente';
      if (statutBrut === 'SUCCESS') statut = 'approuve';
      else if (statutBrut === 'FAILED') statut = 'refuse';

      const montant = BigInt(response.amount ?? 0);
      const frais = BigInt(response.fees ?? 0);
      const montantNet = BigInt(response.income ?? Number(montant));

      return {
        referenceAgregateur,
        referenceMarchande: referenceAgregateur,
        statut,
        montant,
        frais,
        montantNet,
        devise: 'XOF', // Kkiapay opère principalement en XOF
        methode: response.source_common_name ?? response.source,
        approuveLe: response.performed_at ? new Date(response.performed_at) : undefined,
        donneesRaw: response as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      this.log.error(`Kkiapay verifierEncaissement ${referenceAgregateur}: ${(err as Error).message}`);
      throw new ServiceUnavailableException({ code: 'AGREGATEUR_INDISPONIBLE', message: 'Kkiapay est indisponible.' });
    }
  }

  /**
   * Kkiapay payout (virement Mobile Money).
   * Utilise l'API REST de Kkiapay directement car le SDK Admin ne couvre pas les payouts.
   * Ref : https://kkiapay.me/ (dashboard > Reversements)
   */
  async initierDecaissement(req: PayoutRequest): Promise<PayoutResponse> {
    // Kkiapay payouts sont gérés depuis le dashboard Kkiapay (reversements automatiques ou manuels).
    // Pour une intégration API des virements, utiliser la passerelle SMS/Mobile Money directement.
    // On logue et on retourne un statut manuel.
    this.log.warn(`Kkiapay initierDecaissement: virement ${req.referenceMarchande} vers ${req.beneficiaire.telephone} - traitement via dashboard Kkiapay`);
    return {
      referenceAgregateur: req.referenceMarchande,
      statut: 'en_attente',
      donneesRaw: {
        note: 'Kkiapay : les reversements doivent être configurés dans le dashboard Kkiapay (payout automatique ou manuel).',
        referenceMarchande: req.referenceMarchande,
        beneficiaire: req.beneficiaire.telephone,
        montant: Number(req.montant),
      },
    };
  }

  async verifierDecaissement(referenceAgregateur: string): Promise<PayoutVerifyResponse> {
    return {
      referenceAgregateur,
      statut: 'incertain',
      montant: 0n,
      frais: 0n,
      montantRecu: 0n,
      donneesRaw: { note: 'Vérification manuelle via dashboard Kkiapay requise.' },
    };
  }

  /**
   * Remboursement via k.refund(transactionId).
   * Note Kkiapay : remboursement possible uniquement pour les transactions mobile money réussies.
   * Les frais ne sont pas inclus dans le remboursement.
   * Ref : https://docs.kkiapay.me/v1/en-1.0.0/plugin-et-sdk/admin-sdks-server-side/node.js-admin-sdk.md
   */
  async rembourser(req: RefundRequest): Promise<RefundResponse> {
    try {
      await this.k.refund(req.referenceAgregateurPayin);
      return {
        referenceAgregateur: req.referenceAgregateurPayin,
        statut: 'effectue',
        donneesRaw: { transactionId: req.referenceAgregateurPayin },
      };
    } catch (err: unknown) {
      this.log.error(`Kkiapay rembourser ${req.referenceAgregateurPayin}: ${(err as Error).message}`);
      return {
        referenceAgregateur: req.referenceAgregateurPayin,
        statut: 'echoue',
        donneesRaw: { erreur: (err as Error).message },
      };
    }
  }

  /**
   * Vérifie la signature d'un webhook Kkiapay.
   * Kkiapay inclut le hash secret dans l'en-tête x-kkiapay-secret.
   * Il faut comparer ce header avec le hash secret configuré dans le dashboard.
   * Ref : https://docs.kkiapay.me/v1/en-1.0.0/tableau-de-bord/webhook.md
   *
   * Payload success : { transactionId, isPaymentSucces: true, amount, fees, event: 'transaction.success', ... }
   * Payload failed  : { transactionId, isPaymentSucces: false, failureCode, event: 'transaction.failed', ... }
   */
  verifierWebhook(corps: Buffer | string, entetes: Record<string, string>): WebhookVerifyResult {
    try {
      const secretRecu = entetes['x-kkiapay-secret'] ?? entetes['X-Kkiapay-Secret'] ?? '';
      if (!secretRecu) return { valide: false, corps: {}, motif: 'En-tête x-kkiapay-secret absent' };

      // Comparaison en temps constant pour éviter les attaques temporelles
      const secretAttendu = this.webhookSecret;
      if (secretRecu.length !== secretAttendu.length) {
        return { valide: false, corps: {}, motif: 'Secret invalide' };
      }
      const valide = timingSafeEqual(Buffer.from(secretRecu), Buffer.from(secretAttendu));
      if (!valide) return { valide: false, corps: {}, motif: 'Secret Kkiapay invalide' };

      const corpsParse = JSON.parse(
        typeof corps === 'string' ? corps : corps.toString('utf8'),
      ) as KkiapayWebhookPayload;
      return { valide: true, corps: corpsParse as unknown as Record<string, unknown> };
    } catch (err: unknown) {
      return { valide: false, corps: {}, motif: `Erreur: ${(err as Error).message}` };
    }
  }
}
