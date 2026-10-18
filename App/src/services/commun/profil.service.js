import { authApi as api } from '../../lib/commun/http'
import { getDeviceId, getDeviceInfo } from '../../lib/identite/device'

/**
 * Service Profil - commun à tous les rôles connectés.
 * Toutes les routes /v1/moi/* du microservice Identité.
 */
export const profilService = {
  /* ── Profil ── */
  lire: () => api.get('/moi'),

  /* ── Identifiants de récupération ── */
  lireIdentifiants: () => api.get('/moi/identifiants-recuperation'),
  ajouterIdentifiant: ({ type, valeur }) =>
    api.post('/moi/identifiants-recuperation', { type, valeur }),

  /* ── Questions de sécurité ── */
  configurerQuestions: (questions) =>
    api.put('/moi/questions-securite', { questions }),

  /* ── Appareils & sessions ── */
  listerAppareils: () => api.get('/moi/appareils'),
  revoquerAppareil: (uuid) => api.delete(`/moi/appareils/${uuid}`),

  /* ── Biométrie (WebAuthn) ── */
  optionsEnregistrement: () => api.post('/auth/webauthn/options-enregistrement'),
  verifierEnregistrement: (reponse) =>
    api.post('/auth/webauthn/verifier-enregistrement', {
      identifiantLocal: getDeviceId(),
      reponse,
    }),

  /* ── Déconnexion ── */
  deconnexion: () => api.post('/auth/deconnexion', undefined, { retry: false }),
}
