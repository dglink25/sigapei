/**
 * Constantes du module E-Learning (même pattern que SERVICE_PATHS /
 * ADMIN_PATHS) : le module est monté sous /elearning/* dans App.jsx et
 * reste en accès démonstration tant que la gateway ne fournit pas les
 * claims JWT (rôles et tenant fournis par le profil de démonstration).
 */
export const ELEARNING_PREFIXE = '/elearning'

export const ELEARNING_PATHS = {
  racine: '/elearning',
  accueil: '/elearning/',
  profil: '/elearning/profil',
  cours: '/elearning/cours',
  coursNouveau: '/elearning/cours/nouveau',
  coursDetail: (uuid) => `/elearning/cours/${uuid}`,
  coursModifier: (uuid) => `/elearning/cours/${uuid}/modifier`,
  devoirs: '/elearning/devoirs',
  devoirsNouveau: '/elearning/devoirs/nouveau',
  devoirsDetail: (uuid) => `/elearning/devoirs/${uuid}`,
  quiz: '/elearning/quiz',
  quizNouveau: '/elearning/quiz/nouveau',
  quizDetail: (uuid) => `/elearning/quiz/${uuid}`,
  quizPassation: (uuid) => `/elearning/quiz/${uuid}/passer`,
  tentativeDetail: (uuid) => `/elearning/tentatives/${uuid}`,
  bibliotheque: '/elearning/bibliotheque',
  medias: '/elearning/medias',
  statistiques: '/elearning/administration/statistiques',
  parametres: '/elearning/administration/parametres',
  activiteApprenant: '/elearning/administration/apprenant',
}

// Rôles autorisés par famille de routes (bilan RBAC validé) :
// - GESTION : écriture pédagogique, notation, validation, report ;
// - SANS_PARENT : tentatives de quiz (le parent n'y a pas accès) ;
// - APPRENANT : passation d'un quiz ;
// - ADMINISTRATION : PUT /v1/parametres/ du tenant.
export const GESTION = ['enseignant', 'administrateur', 'super_admin']
export const SANS_PARENT = ['apprenant', 'enseignant', 'administrateur', 'super_admin']
export const ADMINISTRATION = ['administrateur', 'super_admin']
export const APPRENANT = ['apprenant']
export const ELEVES = ['apprenant', 'parent']
