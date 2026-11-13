/**
 * Configuration du microservice Paiement.
 * RÈGLE : aucun secret dans le code ni dans le dépôt. Toutes les clés viennent de variables d'environnement
 * (ou d'un coffre de secrets qui les injecte au démarrage). Voir .env.example.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '4010', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'v1',
  internalApiSecret: process.env.INTERNAL_API_SECRET,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:4010',

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA ?? 'paiement',
    ssl: process.env.DB_SSL === 'true',
    roleApplicatif: process.env.DB_ROLE_APPLICATIF,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    queuePaiement: process.env.RABBITMQ_QUEUE_PAIEMENT ?? 'paiement.rpc',
  },

  /** Vérification des jetons émis par Identité. */
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    issuer: process.env.JWT_ISSUER ?? 'api-identite.sigapei.com',
  },

  /**
   * Chiffrement des données sensibles (numéros de téléphone, etc.) : AES-256-GCM avec trousseau versionné.
   */
  chiffrement: {
    cles: process.env.CLES_CHIFFREMENT,
    versionCourante: parseInt(process.env.CLE_CHIFFREMENT_COURANTE ?? '1', 10),
    cleEmpreinte: process.env.CLE_EMPREINTE,
  },

  /** FedaPay – collecte (payin) + dépôt (payout) + webhooks */
  fedapay: {
    secretKey: process.env.FEDAPAY_SECRET_KEY,
    webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET,
    environment: (process.env.FEDAPAY_ENVIRONMENT ?? 'live') as 'test' | 'live',
    apiUrl: process.env.FEDAPAY_API_URL ?? 'https://api.fedapay.com',
  },

  /** Kkiapay – collecte + virement + remboursement + webhooks */
  kkiapay: {
    publicKey: process.env.KKIAPAY_PUBLIC_KEY,
    privateKey: process.env.KKIAPAY_PRIVATE_KEY,
    secretKey: process.env.KKIAPAY_SECRET_KEY,
    webhookSecret: process.env.KKIAPAY_WEBHOOK_SECRET,
    sandbox: process.env.KKIAPAY_SANDBOX === 'true',
  },

  /** CinetPay – initialisation + vérification + notification IPN */
  cinetpay: {
    apiKey: process.env.CINETPAY_API_KEY,
    siteId: process.env.CINETPAY_SITE_ID,
    notifySecret: process.env.CINETPAY_NOTIFY_SECRET,
    environment: (process.env.CINETPAY_ENVIRONMENT ?? 'production') as 'production' | 'test',
    apiUrl: process.env.CINETPAY_API_URL ?? 'https://api-checkout.cinetpay.com/v2',
  },

  /** Notifications email (SMTP) */
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },

  /** Notifications SMS */
  sms: {
    gatewayUrl: process.env.SMS_GATEWAY_URL,
    gatewayToken: process.env.SMS_GATEWAY_TOKEN,
    from: process.env.SMS_FROM,
  },

  /** Notifications WhatsApp */
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL,
    apiToken: process.env.WHATSAPP_API_TOKEN,
    from: process.env.WHATSAPP_FROM,
  },

  /** Stockage reçus */
  recus: {
    storagePath: process.env.RECUS_STORAGE_PATH ?? './storage/recus',
    verifyDomain: process.env.RECUS_VERIFY_DOMAIN ?? 'sigapei.bj',
    lienDureeMinutes: parseInt(process.env.RECUS_LIEN_DUREE_MINUTES ?? '60', 10),
  },
});
