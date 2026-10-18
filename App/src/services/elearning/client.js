import axios from 'axios'

import { useProfilStore } from '../../context/elearning/profil.js'

// Taille de page configurée côté DRF (PAGE_SIZE de settings.py).
export const TAILLE_PAGE = 20

// Instance unique : baseURL relative « /v1 » passe par le proxy Vite en
// développement (voir vite.config.js), ce qui évite tout problème de CORS.
export const api = axios.create({
  baseURL: '/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Le backend exige sur toutes les routes /v1/ :
// - un X-Tenant-ID UUID valide ;
// - un X-Role (stand-in du futur claim JWT fourni par la gateway) ;
// - un X-Apprenant-ID pour les rôles apprenant/parent (l'élève
//   lui-même, ou son enfant) : le backend y restreint les soumissions,
//   tentatives et réponses.
api.interceptors.request.use((config) => {
  const { tenantId, role, apprenantId } = useProfilStore.getState()
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }
  if (role) {
    config.headers['X-Role'] = role
  }
  if ((role === 'apprenant' || role === 'parent') && apprenantId) {
    config.headers['X-Apprenant-ID'] = apprenantId
  }
  return config
})

/**
 * Transforme n'importe quelle erreur Axios en message français lisible :
 * - 400 : détail champ par champ renvoyé par DRF ;
 * - 503 : message du backend (service externe non configuré) ;
 * - panne réseau : indication de vérifier le backend.
 */
export function messageErreur(erreur) {
  if (!axios.isAxiosError(erreur)) {
    return 'Une erreur inattendue est survenue.'
  }
  if (!erreur.response) {
    return 'Serveur injoignable : vérifiez que le backend est démarré (port 8000).'
  }
  const { status, data } = erreur.response
  if (status === 400 && data && typeof data === 'object') {
    const details = Object.entries(data).map(([champ, valeur]) => {
      const texte = Array.isArray(valeur) ? valeur.join(' ') : String(valeur)
      return `${champ} : ${texte}`
    })
    return details.length > 0 ? details.join(' - ') : 'Requête invalide.'
  }
  if (data && typeof data === 'object' && data.detail) {
    return String(data.detail)
  }
  if (status === 401) return 'Authentification requise.'
  if (status === 403) return 'Accès refusé.'
  if (status === 404) return 'Ressource introuvable.'
  if (status === 405) return 'Action non autorisée par l\u2019API.'
  if (status === 500) return 'Erreur interne du serveur.'
  return `Erreur ${status}.`
}
