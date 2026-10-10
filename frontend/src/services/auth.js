/**
 * Service d'authentification SIGAPEI.
 *
 * Gère le login, la session utilisateur et la correspondance des rôles
 * entre le frontend et le microservice Identité.
 */

import { login as apiLogin, logout as apiLogout, getCurrentUser, isAuthenticated } from '../services/api';
import { toBackRole, toFrontRole } from '../config/roles';

/**
 * Authentifie l'utilisateur et normalise la session.
 * Retourne l'objet utilisateur front avec le rôle converti.
 */
export async function authenticate(email, password) {
  const data = await apiLogin(email, password);

  // Mode dégradé : Identité non disponible
  if (!data) {
    return null;
  }

  // Le back émet le roleCode en snake_case ou camelCase selon la version
  const rawRole = data.role_code || data.roleCode || data.role || null;
  const frontRole = rawRole ? toFrontRole(rawRole) : 'parent';

  return {
    uuid: data.uuid || null,
    nom: data.nom || data.nom_complet || email,
    role: frontRole,
    backRole: rawRole,
    etablissement: data.etablissement_nom || data.nom_etablissement || '',
    token: data.token,
    tenantId: data.tenant_id || data.tenantId || '1',
  };
}

/**
 * Déconnecte l'utilisateur et nettoie la session.
 */
export function logout() {
  apiLogout();
}

/**
 * Récupère l'utilisateur courant depuis la session.
 */
export function getUser() {
  return getCurrentUser();
}

/**
 * Vérifie si une session active existe.
 */
export function isLoggedIn() {
  return isAuthenticated();
}

/**
 * Retourne le rôle back (pour les appels API si nécessaire).
 */
export function getBackRole(frontRole) {
  return toBackRole(frontRole);
}
