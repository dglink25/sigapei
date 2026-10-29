/**
 * Interfaces de services DISPONIBLES : code du service -> { composant, avecLayout? }.
 * Tant qu'un code n'est pas listé ici, son interface affiche « Bientôt disponible ».
 *
 * avecLayout: true  → le composant gère son propre layout (pas de PortailLayout)
 * avecLayout: false → le composant est rendu dans PortailLayout (défaut)
 */
import { lazy } from 'react'

export const COMPOSANTS_SERVICES = {
  scolarite: {
    composant:  lazy(() => import('../../pages/etablissements/ScolaritePage')),
    avecLayout: true,
  },
  inscription: {
    composant:  lazy(() => import('../../pages/inscription/InscriptionPage')),
    avecLayout: true,
  },
}

export const serviceDisponible = (code) => Object.prototype.hasOwnProperty.call(COMPOSANTS_SERVICES, code)

/** Retourne le composant lazy du service, quelle que soit la forme d'entrée. */
export const composantService = (code) => {
  const e = COMPOSANTS_SERVICES[code]
  if (!e) return null
  return e.composant ?? e // rétrocompatibilité si valeur directe
}

/** true si le service gère son propre layout (pas de PortailLayout) */
export const serviceAvecLayout = (code) => COMPOSANTS_SERVICES[code]?.avecLayout === true
