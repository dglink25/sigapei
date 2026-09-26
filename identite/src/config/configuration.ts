export default () => ({
  port: parseInt(process.env.PORT ?? '4001', 10),
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
    schema: process.env.DB_SCHEMA ?? 'identite',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
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
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'sigapei.events',
    queueIdentite: process.env.RABBITMQ_QUEUE_IDENTITE ?? 'identite.rpc',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    issuer: process.env.JWT_ISSUER ?? 'api-identite.sigapei.com',
  },

  otp: {
    ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    maxResendsPerWindow: parseInt(process.env.OTP_MAX_RESENDS_PER_WINDOW ?? '3', 10),
    resendWindowSeconds: parseInt(process.env.OTP_RESEND_WINDOW_SECONDS ?? '600', 10),
  },

  convessa: {
    apiUrl: process.env.CONVESSA_API_URL,
    apiKey: process.env.CONVESSA_API_KEY,
  },

  smsGateway: {
    url: process.env.SMS_GATEWAY_URL,
    apiKey: process.env.SMS_GATEWAY_API_KEY,
    senderPool: (process.env.SMS_GATEWAY_SENDER_POOL ?? '').split(',').filter(Boolean),
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    appPassword: process.env.SMTP_APP_PASSWORD,
    from: process.env.SMTP_FROM,
  },

  captcha: {
    provider: process.env.CAPTCHA_PROVIDER ?? 'recaptcha',
    secretKey: process.env.CAPTCHA_SECRET_KEY,
    minScore: parseFloat(process.env.CAPTCHA_MIN_SCORE ?? '0.5'),
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },

  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID,
    rpName: process.env.WEBAUTHN_RP_NAME ?? 'sigapei',
    origin: process.env.WEBAUTHN_ORIGIN,
  },
});
