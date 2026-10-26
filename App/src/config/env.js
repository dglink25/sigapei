const e = import.meta.env
const url = (v) => (v ?? '').toString().trim().replace(/\/+$/, '')
const str = (v) => (v ?? '').toString().trim()

export const ENV = Object.freeze({
  appName: str(e.VITE_APP_NAME) || 'SIGAPEI',
  timeout: Number(e.VITE_API_TIMEOUT) || 15000,
  idleMinutes: Number(e.VITE_IDLE_TIMEOUT_MINUTES) || 15,
  recaptchaKey: str(e.VITE_RECAPTCHA_SITE_KEY),
  apiPrefix: '/v1',
  services: Object.freeze({
    auth: url(e.VITE_AUTH_SERVICE_URL) || '',
    gateway: url(e.VITE_GATEWAY_SERVICE_URL) || url(e.VITE_API_URL),
    inscription: url(e.VITE_INSCRIPTION_SERVICE_URL),
    scolarite: url(e.VITE_SCOLARITE_SERVICE_URL),
    etablissement: url(e.VITE_ETABLISSEMENT_SERVICE_URL),
    vieScolaire: url(e.VITE_VIE_SCOLAIRE_SERVICE_URL),
    rh: url(e.VITE_RH_SERVICE_URL),
    evaluation: url(e.VITE_EVALUATION_SERVICE_URL),
    demande: url(e.VITE_DEMANDE_SERVICE_URL),
  }),
  firebase: Object.freeze({
    apiKey: str(e.VITE_FIREBASE_API_KEY),
    authDomain: str(e.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: str(e.VITE_FIREBASE_PROJECT_ID),
    appId: str(e.VITE_FIREBASE_APP_ID),
  }),
})
