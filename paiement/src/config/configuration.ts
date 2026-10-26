/**
 * Configuration du microservice Paiement.
 * RÈGLE : aucun secret dans le code ni dans le dépôt. Toutes les clés viennent de variables d'environnement
 * (ou d'un coffre de secrets qui les injecte au démarrage). Voir .env.example.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '4003', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'v1',
  internalApiSecret: process.env.INTERNAL_API_SECRET,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA ?? 'paiement',
    ssl: process.env.DB_SSL === 'true',
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
   *  - CLES_CHIFFREMENT : JSON { "1": "<base64 de 32 octets>", "2": "..." }
   *  - CLE_CHIFFREMENT_COURANTE : version utilisée pour chiffrer (les anciennes restent valables pour déchiffrer)
   *  - CLE_EMPREINTE : clé HMAC (32 octets base64) pour les empreintes de recherche/unicité
   */
  chiffrement: {
    cles: process.env.CLES_CHIFFREMENT,
    versionCourante: parseInt(process.env.CLE_CHIFFREMENT_COURANTE ?? '1', 10),
    cleEmpreinte: process.env.CLE_EMPREINTE,
  },
});
