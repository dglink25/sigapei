/**
 * Interfaces de services DISPONIBLES : code du service -> composant (chargement différé).
 * Tant qu'un code n'est pas listé ici, son interface affiche « Bientôt disponible » (portail et page du service).
 * Pour brancher un service :
 *   import { lazy } from 'react'
 *   'vie-scolaire': lazy(() => import('../../pages/services/VieScolairePage')),
 * L'adresse est alors  https://<slug>.sigapei.com/vie-scolaire/...
 */
export const COMPOSANTS_SERVICES = {}

export const serviceDisponible = (code) => Object.prototype.hasOwnProperty.call(COMPOSANTS_SERVICES, code)
