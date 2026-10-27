/** Actions de gestion du module exposees au parametrage (CDC §5.3). */
export const ACTIONS = {
  consulter_demandes: 'Consulter les demandes de documents',
  traiter_demande: 'Traiter une demande (générer le document, rejeter, prioriser)',
  configurer_types: 'Configurer les types de documents, leurs règles et leurs modèles',
  valider_permission_absence: "Valider ou rejeter une permission d'absence",
  accorder_derogation: "Accorder une dérogation d'éligibilité",
  repondre_reclamation: 'Répondre aux réclamations et en ouvrir vers un usager',
  consulter_statistiques: 'Consulter les statistiques du module',
} as const;

export type Action = keyof typeof ACTIONS;
export const LISTE_ACTIONS = Object.keys(ACTIONS) as Action[];

export const CATEGORIES_RECLAMATION = ['pedagogique', 'discipline', 'finances', 'ressources_humaines', 'autre'] as const;
export type CategorieReclamation = (typeof CATEGORIES_RECLAMATION)[number];

/** Role disposant toujours de toutes les actions : le fondateur / administrateur de l'etablissement. */
export const ROLE_ADMINISTRATEUR = 'administrateur';
