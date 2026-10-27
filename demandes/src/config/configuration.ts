export default () => ({
  port: parseInt(process.env.PORT ?? '4007', 10),
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
    // Toutes les tables de ce depot vivent dans le schema "demandes" de la base UNIQUE partagee (Regle n°1).
    schema: process.env.DB_SCHEMA ?? 'demandes',
    ssl: process.env.DB_SSL === 'true',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'sigapei.events',
  },
  // Autres microservices : appels HTTP /v1/interne/* avec X-Internal-Secret (jamais de jointure SQL inter-schemas).
  services: {
    identite: process.env.IDENTITE_URL ?? 'http://api-identite:4001',
    etablissements: process.env.ETABLISSEMENTS_URL ?? 'http://api-etablissements:4002',
    scolarite: process.env.SCOLARITE_URL ?? 'http://api-scolarite:4004',
    evaluations: process.env.EVALUATIONS_URL ?? 'http://api-evaluations:4006',
    rh: process.env.RH_URL ?? 'http://api-rh:4009',
    timeoutMs: 5000,
  },
  // Code de ce module dans le catalogue des services d'Identite (acces par role et par etablissement).
  codeService: process.env.IDENTITE_CODE_SERVICE ?? 'demandes',
});
