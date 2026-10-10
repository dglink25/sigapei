import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Rôles possibles (le SSO/JWT de la gateway n'existe pas encore : ce profil
// est un stand-in de démonstration, persisté dans localStorage).
export const ROLES = [
  { valeur: 'enseignant', libelle: 'Enseignant' },
  { valeur: 'apprenant', libelle: 'Apprenant' },
  { valeur: 'parent', libelle: 'Parent' },
  { valeur: 'administrateur', libelle: 'Administrateur' },
]

export const useProfilStore = create(
  persist(
    (set) => ({
      tenantId: '',
      role: 'enseignant',
      // UUID externes (autres microservices) : matiere, classe, enseignant,
      // apprenant. Ils servent à préremplir les formulaires et les filtres.
      matiereId: '',
      classeId: '',
      enseignantId: '',
      apprenantId: '',
      majProfil: (valeurs) => set(valeurs),
    }),
    { name: 'elearning-profil' },
  ),
)

/** L'utilisateur courant peut-il créer / modifier du contenu pédagogique ? */
export function peutPublier(role) {
  return role === 'enseignant' || role === 'administrateur'
}

/** L'utilisateur courant agit-il comme apprenant (dépôt, passage de quiz) ? */
export function agitCommeApprenant(role) {
  return role === 'apprenant' || role === 'parent'
}
