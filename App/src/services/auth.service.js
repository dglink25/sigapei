import { authApi as api } from '../lib/http'
import { getDeviceId, getDeviceInfo } from '../lib/device'

const PUBLIC = { auth: false }

/**
 * Toutes les routes du microservice Identite (SSO).
 * Les champs des endpoints /recuperation/* ne sont pas detailles dans la doc Swagger fournie :
 * ils sont isoles ici pour etre ajustes en un seul endroit.
 */
export const authService = {
  /* ---- Connexion ---- */
  identifier: (identifiant) => api.post('/auth/identifier', { identifiant }, PUBLIC),
  envoyerOtp: (identifiant, captchaToken) => api.post('/auth/otp/envoyer', { identifiant, captchaToken }, PUBLIC),
  verifierOtp: (identifiant, code) =>
    api.post('/auth/otp/verifier', { identifiant, code, appareil: getDeviceInfo() }, PUBLIC),
  firebase: (idToken) => api.post('/auth/firebase/verifier', { idToken, appareil: getDeviceInfo() }, PUBLIC),

  /* ---- Empreinte (WebAuthn) ---- */
  webauthnOptionsConnexion: (matricule) =>
    api.post('/auth/webauthn/options-connexion', { matricule, identifiantLocal: getDeviceId() }, PUBLIC),
  webauthnVerifierConnexion: (matricule, reponse) =>
    api.post(
      '/auth/webauthn/verifier-connexion',
      { matricule, identifiantLocal: getDeviceId(), reponse, appareilInfo: getDeviceInfo() },
      PUBLIC,
    ),
  webauthnOptionsEnregistrement: () => api.post('/auth/webauthn/options-enregistrement'),
  webauthnVerifierEnregistrement: (reponse) =>
    api.post('/auth/webauthn/verifier-enregistrement', { identifiantLocal: getDeviceId(), reponse }),

  /* ---- Session ---- */
  logout: () => api.post('/auth/deconnexion', undefined, { retry: false }),
  me: () => api.get('/moi'),
  devices: () => api.get('/moi/appareils'),
  revokeDevice: (uuid) => api.delete(`/moi/appareils/${uuid}`),

  /* ---- Recuperation d'identifiant ---- */
  rechercherCompte: ({ indice, captchaToken }) =>
    api.post('/recuperation/rechercher-compte', { indice, captchaToken }, PUBLIC),
  envoyerOtpRecuperation: (compteUuid) => api.post('/recuperation/envoyer-otp', { compteUuid }, PUBLIC),
  confirmerRecuperation: (compteUuid, code) => api.post('/recuperation/confirmer', { compteUuid, code }, PUBLIC),
}
