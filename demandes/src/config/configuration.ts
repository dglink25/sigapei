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
    // Toutes les tables de ce depot vivent dans le schema "demandes"
    // de la base UNIQUE partagee (CDC Regle n°1).
    schema: process.env.DB_SCHEMA ?? 'demandes',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    // REDIS_DB=6 (identite=0, etablissements=1, inscription=2,
    //             scolarite=3, evaluations=4, finances=5)
    db: parseInt(process.env.REDIS_DB ?? '6', 10),
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'sigapei.events',
  },

});
