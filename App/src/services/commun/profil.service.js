import { authApi as api } from '../../lib/commun/http'
import { getDeviceId } from '../../lib/identite/device'


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
