import axios from 'axios'

import { useProfilStore } from '../stores/profil.js'

// Instance unique : baseURL relative « /v1 » passe par le proxy Vite en
// développement (voir vite.config.js), ce qui évite tout problème de CORS.
// Le backend Laravel expose ses routes à la racine (apiPrefix: ''), donc
// l'URL réelle est bien /v1/... et non /api/v1/...
export const api = axios.create({
  baseURL: '/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Le backend exige un contexte transmis par la passerelle (règle n°5) :
//  - X-Tenant-Id  : identifiant NUMÉRIQUE du tenant (obligatoire, 401 sinon) ;
//  - X-User-Id    : uuid de l'utilisateur (claim sub) ;
//  - X-User-Role  : rôle sur ce module (enseignant, censeur, ...).
// Le jeton CAPTCHA (règle n°4) est ajouté sur les écritures s'il est renseigné.
api.interceptors.request.use((config) => {
  const { tenantId, userId, role, captchaToken } = useProfilStore.getState()

  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId
  }
  if (userId) {
    config.headers['X-User-Id'] = userId
  }
  if (role) {
    config.headers['X-User-Role'] = role
  }
  if (captchaToken && config.method && config.method !== 'get') {
    config.headers['X-Captcha-Token'] = captchaToken
  }

  return config
})

/**
 * Transforme n'importe quelle erreur Axios en message français lisible :
 * - 422 : erreurs de validation Laravel ({ errors: { champ: [messages] } })
 *   ou message du middleware CAPTCHA ;
 * - 401/403 : contexte tenant manquant, secret interne invalide ;
 * - 503 : vérification CAPTCHA indisponible (clé secrète non configurée) ;
 * - panne réseau : indication de vérifier le backend.
 */
export function messageErreur(erreur) {
  if (!axios.isAxiosError(erreur)) {
    return 'Une erreur inattendue est survenue.'
  }
  if (!erreur.response) {
    return 'Serveur injoignable : vérifiez que le backend est démarré (port 4005).'
  }

  const { status, data } = erreur.response
  const corps = data && typeof data === 'object' ? data : {}

  // Erreurs de validation Laravel : { message, errors: { champ: [...] } }
  if (corps.errors && typeof corps.errors === 'object') {
    const details = Object.entries(corps.errors).map(([champ, valeur]) => {
      const texte = Array.isArray(valeur) ? valeur.join(' ') : String(valeur)
      return `${champ} : ${texte}`
    })
    if (details.length > 0) {
      return details.join(' - ')
    }
  }

  if (typeof corps.message === 'string' && corps.message) {
    return corps.message
  }

  if (status === 401) return 'Contexte tenant manquant ou invalide.'
  if (status === 403) return 'Accès refusé.'
  if (status === 404) return 'Ressource introuvable.'
  if (status === 405) return 'Action non autorisée par l\u2019API.'
  if (status === 422) return 'Requête invalide.'
  if (status === 503) return 'Service indisponible.'
  if (status === 500) return 'Erreur interne du serveur.'
  return `Erreur ${status}.`
}
