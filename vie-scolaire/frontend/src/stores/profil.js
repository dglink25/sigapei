import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Rôles possibles sur le module Vie scolaire (le SSO/JWT de la gateway
// n'existe pas encore : ce profil est un stand-in de démonstration,
// persisté dans localStorage).
export const ROLES = [
  { valeur: 'enseignant', libelle: 'Enseignant' },
  { valeur: 'censeur', libelle: 'Censeur' },
  { valeur: 'administrateur', libelle: 'Administrateur' },
  { valeur: 'parent', libelle: 'Parent' },
  { valeur: 'apprenant', libelle: 'Apprenant' },
]

export const useProfilStore = create(
  persist(
    (set) => ({
      // X-Tenant-Id : identifiant NUMÉRIQUE du tenant (règle n°5).
      tenantId: '',
      role: 'enseignant',
      // X-User-Id : uuid de l'utilisateur connecté (claim sub).
      userId: '',
      // UUID externes (autres microservices) servant à préremplir filtres et
      // formulaires : apprenant (scolarite), classe (scolarite), cours
      // (scolarite.emplois_du_temps).
      apprenantId: '',
      classeId: '',
      coursId: '',
      // Jeton CAPTCHA : produit normalement par le widget reCAPTCHA/hCaptcha
      // du front. Saisi ici pour la démonstration (règle n°4).
      captchaToken: '',
      majProfil: (valeurs) => set(valeurs),
    }),
    { name: 'viescolaire-profil' },
  ),
)

/** L'enseignant, le censeur ou l'administrateur peuvent saisir des présences. */
export function peutSaisir(role) {
  return ['enseignant', 'censeur', 'administrateur'].includes(role)
}

/** Correction : l'enseignant (fenêtre limitée) puis censeur/administrateur. */
export function peutCorriger(role) {
  return ['enseignant', 'censeur', 'administrateur'].includes(role)
}

/** Pilotage vie scolaire (signalements, sanctions, alertes). */
export function estPilotage(role) {
  return ['censeur', 'administrateur'].includes(role)
}

/** L'utilisateur consulte le dossier d'un apprenant (vue parent/apprenant). */
export function agitCommeApprenant(role) {
  return role === 'apprenant' || role === 'parent'
}
