/**
 * Correspondance entre les rôles exposés par le frontend et les rôles
 * émis par le microservice Identité dans le claim `roleCode` du JWT.
 *
 * Le middleware `VerifyRole` de scolarite et inscription compare le `roleCode`
 * brut du JWT à des listes codées en dur dans routes/api.php. Un rôle front
 * qui ne correspondrait pas à un rôle back recevrait un 403 sur toutes les
 * routes protégées.
 *
 * Rôles back (identite/src/roles/role.entity.ts) :
 *   super_admin | administrateur | personnel | enseignant | apprenant | parent
 *
 * Les rôles `censeur` et `comptable` n'existent pas encore dans Identité.
 * Ils sont mappés vers `personnel` en attendant la création de rôles dédiés.
 */
export const ROLE_MAP = {
  // front        // back (roleCode dans le JWT)
  admin:        'administrateur',
  secretaire:    'personnel',
  censeur:       'personnel',   // TODO: créer un rôle censeur dans identite
  comptable:     'personnel',   // TODO: créer un rôle comptable dans identite
  enseignant:    'enseignant',
  parent:        'parent',
  candidat:      'apprenant',
};

/** Inverse : role back → role front. */
export const ROLE_MAP_REVERSE = Object.fromEntries(
  Object.entries(ROLE_MAP).map(([k, v]) => [v, k])
);

/** Rôles qui utilisent le layout admin (sidebar + header). */
export const ADMIN_LAYOUT_ROLES = ['admin', 'secretaire', 'censeur'];

/** Labels affichés dans l'UI. */
export const ROLE_LABELS = {
  admin:      { label: 'Administrateur',        module: 'Direction Générale' },
  secretaire: { label: 'Secrétaire de Scolarité', module: 'Admissions & Guichet' },
  censeur:    { label: 'Censeur des Études',    module: 'Pédagogie & Notes' },
  enseignant: { label: 'Enseignant Certifié',   module: 'Espace Pédagogique' },
  comptable:  { label: 'Comptable & Caissier',  module: 'Gestion Financière' },
  parent:     { label: 'Parent Référent',       module: 'Espace Famille & Élève' },
  candidat:   { label: 'Candidat / Visiteur',   module: 'Portail Admission' },
};

/**
 * Convertit un rôle front en rôle back pour les appels API.
 */
export function toBackRole(frontRole) {
  return ROLE_MAP[frontRole] || frontRole;
}

/**
 * Convertit un rôle back en rôle front pour l'affichage.
 */
export function toFrontRole(backRole) {
  return ROLE_MAP_REVERSE[backRole] || backRole;
}
