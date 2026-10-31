// Chemins centralises : a modifier ici si les URLs changent.
export const LOGIN_PATH      = '/login'
export const HOME_PATH       = '/'
export const SECURITY_PATH   = '/securite'
export const COMPTE_PATH     = '/compte'
export const FORBIDDEN_PATH  = '/acces-refuse'

// Post-connexion - redirection selon le role
export const ADMIN_DASHBOARD_PATH    = '/admin/dashboard'
export const PORTAIL_PATH            = '/portail'
export const DASHBOARD_TEMP_PATH     = '/dashboard'
export const APPRENANT_DASHBOARD_PATH = '/apprenant'
export const PARENT_DASHBOARD_PATH    = '/parent'
export const PRESTATAIRE_DASHBOARD_PATH = '/prestataire'

/** Roles qui accèdent au portail services (élèves, parents, visiteurs, prestataires) */
export const PORTAIL_ROLES  = ['etudiant', 'eleve', 'parent', 'visiteur', 'prestataire']

/** Rôles qui n'ont PAS accès à l'admin (tout le monde sauf super_admin) */
export const NON_ADMIN_ROLES = [...PORTAIL_ROLES, 'administrateur', 'enseignant', 'personnel']

/** Résout le roleCodeOf depuis un objet user (tolerant : role chaîne ou objet) */
export function roleCodeOf(user) {
  if (!user) return ''
  if (typeof user.role === 'string') return user.role
  return user.role?.code ?? user.roleCode ?? ''
}

/**
 * Détermine l'espace dédié selon le rôle de l'utilisateur :
 * - apprenant, étudiant, élève -> 'apprenant'
 * - parent, parents, tuteur, responsable légal -> 'parent'
 * - prestataire, prestataires, prestataire_externe, prestataire-externe -> 'prestataire'
 */
export function determinerEspaceRole(roleCode = '') {
  const code = (roleCode || '').toLowerCase().trim().replace(/[-_]/g, '')
  if (['apprenant', 'etudiant', 'eleve', 'apprenants'].some((r) => code.includes(r.replace(/[-_]/g, '')))) {
    return 'apprenant'
  }
  if (['parent', 'parents', 'tuteur', 'responsablelegal'].some((r) => code.includes(r.replace(/[-_]/g, '')))) {
    return 'parent'
  }
  if (['prestataire', 'prestataireexterne', 'prestataires'].some((r) => code.includes(r.replace(/[-_]/g, '')))) {
    return 'prestataire'
  }
  return null
}

/**
 * Retourne le chemin du tableau de bord selon l'espace métier
 */
export function cheminEspaceRole(espace) {
  if (espace === 'apprenant') return APPRENANT_DASHBOARD_PATH
  if (espace === 'parent') return PARENT_DASHBOARD_PATH
  if (espace === 'prestataire') return PRESTATAIRE_DASHBOARD_PATH
  return DASHBOARD_TEMP_PATH
}

/**
 * Résout le chemin de redirection post-connexion :
 * super administrateur -> administration ; tout autre rôle -> PORTAIL_PATH, redirection intelligente
 * (portail de son établissement s'il est administrateur ou a au moins un service, sinon tableau de bord selon son rôle).
 */
export function redirectionPostLogin(roleCode) {
  if (roleCode === 'super_admin') return ADMIN_DASHBOARD_PATH
  return PORTAIL_PATH
}
