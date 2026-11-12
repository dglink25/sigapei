/**
 * Interface commune pour tous les agrégateurs de paiement.
 * Chaque adaptateur (FedaPay, Kkiapay, CinetPay) implémente cette interface.
 * Le code métier n'appelle que cette interface - jamais un SDK directement.
 */

export interface PayinInitRequest {
  referenceMarchande: string;     // identifiant unique dans notre système
  montant: bigint;                 // en unités mineures (ex: 5000 pour 5000 XOF)
  devise: string;                  // code ISO ex: 'XOF'
  libelle: string;
  callbackUrl: string;             // URL de retour après paiement (redirect)
  notifyUrl: string;               // URL de notification silencieuse (webhook/IPN)
  payeur?: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;            // format E.164 ex: +22997000000
    pays?: string;                 // code ISO 2 lettres ex: 'BJ'
  };
  metadonnees?: Record<string, string>;
}

export interface PayinInitResponse {
  referenceAgregateur: string;     // ID de la transaction chez l'agrégateur
  urlPaiement?: string;            // URL vers laquelle rediriger le payeur (si redirection)
  token?: string;                  // token de paiement (si Seamless/widget)
  statut: 'initie' | 'en_attente';
  donneesRaw: Record<string, unknown>; // réponse brute pour audit
}

export interface PayinVerifyResponse {
  referenceAgregateur: string;
  referenceMarchande: string;
  statut: 'approuve' | 'refuse' | 'annule' | 'en_attente' | 'expire';
  montant: bigint;
  frais: bigint;
  montantNet: bigint;
  devise: string;
  methode?: string;
  approuveLe?: Date;
  donneesRaw: Record<string, unknown>;
}

export interface PayoutRequest {
  referenceMarchande: string;
  montant: bigint;
  devise: string;
  description: string;
  beneficiaire: {
    nom: string;
    telephone: string;    // format E.164
    pays: string;         // code ISO 2 lettres
    provider?: string;    // ex: 'mtn', 'moov' (si nécessaire)
  };
  metadonnees?: Record<string, string>;
  planifieLe?: Date;
}

export interface PayoutResponse {
  referenceAgregateur: string;
  statut: 'en_attente' | 'soumis' | 'envoye' | 'echoue';
  donneesRaw: Record<string, unknown>;
}

export interface PayoutVerifyResponse {
  referenceAgregateur: string;
  statut: 'en_attente' | 'soumis' | 'en_cours' | 'envoye' | 'echoue' | 'incertain';
  montant: bigint;
  frais: bigint;
  montantRecu: bigint;
  donneesRaw: Record<string, unknown>;
}

export interface RefundRequest {
  referenceAgregateurPayin: string;
  montant?: bigint;              // si absent : remboursement total
  motif?: string;
}

export interface RefundResponse {
  referenceAgregateur: string;
  statut: 'en_cours' | 'effectue' | 'echoue';
  donneesRaw: Record<string, unknown>;
}

export interface WebhookVerifyResult {
  valide: boolean;
  corps: Record<string, unknown>;
  motif?: string;
}

/** Interface implémentée par chaque adaptateur */
export interface IAgregateur {
  readonly code: string;           // 'fedapay' | 'kkiapay' | 'cinetpay'
  readonly nom: string;

  /** Initialise un encaissement (payin) */
  initierEncaissement(req: PayinInitRequest): Promise<PayinInitResponse>;

  /** Vérifie le statut d'un encaissement */
  verifierEncaissement(referenceAgregateur: string): Promise<PayinVerifyResponse>;

  /** Initie un décaissement (payout/virement) */
  initierDecaissement(req: PayoutRequest): Promise<PayoutResponse>;

  /** Vérifie le statut d'un décaissement */
  verifierDecaissement(referenceAgregateur: string): Promise<PayoutVerifyResponse>;

  /** Rembourse un encaissement */
  rembourser(req: RefundRequest): Promise<RefundResponse>;

  /** Vérifie la signature d'un webhook et retourne le corps parsé */
  verifierWebhook(corps: Buffer | string, entetes: Record<string, string>): WebhookVerifyResult;
}
