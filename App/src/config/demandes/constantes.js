/** Libellés du module Demandes administratives (mêmes codes que le microservice). */

export const STATUTS_DEMANDE = {
  recue: { libelle: 'Reçue', badge: 'info' },
  bloquee: { libelle: 'Bloquée', badge: 'warning' },
  en_traitement: { libelle: 'En traitement', badge: 'info' },
  prete: { libelle: 'Prête', badge: 'success' },
  rejetee: { libelle: 'Rejetée', badge: 'danger' },
  annulee: { libelle: 'Annulée', badge: 'neutral' },
}

export const STATUTS_RECLAMATION = {
  ouverte: { libelle: 'Ouverte', badge: 'warning' },
  en_cours: { libelle: 'En cours', badge: 'info' },
  resolue: { libelle: 'Résolue', badge: 'success' },
  cloturee: { libelle: 'Clôturée', badge: 'neutral' },
}

export const CATEGORIES_RECLAMATION = {
  pedagogique: 'Pédagogique',
  discipline: 'Discipline',
  finances: 'Finances',
  ressources_humaines: 'Ressources humaines',
  autre: 'Autre',
}

export const STATUTS_PERMISSION = {
  en_attente: { libelle: 'En attente', badge: 'warning' },
  validee: { libelle: 'Validée', badge: 'success' },
  rejetee: { libelle: 'Rejetée', badge: 'danger' },
  annulee: { libelle: 'Annulée', badge: 'neutral' },
}

export const CATEGORIES_DEMANDEUR = {
  apprenant: 'Apprenants et parents',
  personnel: 'Personnel',
  tout_profil: 'Tout profil',
}

/** Règles d'éligibilité autorisées par catégorie de demandeur (contrôlées aussi par le service). */
export const REGLES = {
  dossier_actif: { libelle: 'Dossier d\'apprenant actif (Scolarité)', categorie: 'apprenant' },
  bulletins_publies: { libelle: 'Au moins un bulletin publié (Évaluations)', categorie: 'apprenant' },
  solde_a_jour: { libelle: 'Aucune échéance passée impayée (Finances)', categorie: 'apprenant' },
  contrat_actif: { libelle: 'Contrat actif (RH)', categorie: 'personnel' },
}

export const FAMILLE = ['apprenant', 'parent']

export const libelleStatut = (table, code) => table[code] ?? { libelle: code ?? '-', badge: 'neutral' }

export const nomBeneficiaire = (b) => (b ? [b.nom, b.prenom].filter(Boolean).join(' ') + (b.classe ? ` (${b.classe})` : '') : null)

/** Code de rôle lisible : « chef_service » -> « Chef service ». */
export const libelleRole = (code) => (code ? code.charAt(0).toUpperCase() + code.slice(1).replace(/[_-]+/g, ' ') : '-')
