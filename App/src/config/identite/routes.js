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

/** Résout le chemin de redirection post-connexion selon le rôle de l'utilisateur */
export function redirectionPostLogin(roleCode) {
  if (!roleCode) return PORTAIL_PATH
  if (roleCode === 'super_admin') return ADMIN_DASHBOARD_PATH
  if (PORTAIL_ROLES.includes(roleCode)) return PORTAIL_PATH
  return DASHBOARD_TEMP_PATH
}
