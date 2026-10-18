import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tokenStore } from '../../lib/identite/tokenStore'

// Rôles possibles (stand-in de démonstration + rôle réel retourné par identite).
export const ROLES = [
  { valeur: 'enseignant', libelle: 'Enseignant' },
  { valeur: 'apprenant', libelle: 'Apprenant' },
  { valeur: 'parent', libelle: 'Parent' },
  { valeur: 'administrateur', libelle: 'Administrateur' },
  { valeur: 'super_admin', libelle: 'Super Administrateur' },
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

// Synchronise le profil elearning avec la session identite (tenant_id, role)
// quand elle est disponible.
export function syncProfilDepuisIdentite() {
  const user = tokenStore.getUser()
  if (!user) return null
  const prochain = {}
  if (user.tenant_id) prochain.tenantId = String(user.tenant_id)
  if (user.role) prochain.role = String(user.role)
  if (Object.keys(prochain).length > 0) {
    // Zustand : appeler set directement hors du composant n'est pas possible
    // sans le store ; on retourne les valeurs pour que l'appelant les applique.
    return prochain
  }
  return null
}

/** L'utilisateur courant peut-il créer / modifier du contenu pédagogique ? */
export function peutPublier(role) {
  return role === 'enseignant' || role === 'administrateur' || role === 'super_admin'
}

/** L'utilisateur courant agit-il comme apprenant (dépôt, passage de quiz) ? */
export function agitCommeApprenant(role) {
  return role === 'apprenant' || role === 'parent'
}
