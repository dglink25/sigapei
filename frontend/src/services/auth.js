/**
 * Service d'authentification SIGAPEI.
 *
 * Gère le login, la session utilisateur et la correspondance des rôles
 * entre le frontend et le microservice Identité.
 */

import { login as apiLogin, logout as apiLogout, getCurrentUser, isAuthenticated } from '../services/api';
import { toBackRole, toFrontRole } from '../config/roles';

// Jetons JWT de développement signés avec le secret réel (valides jusqu'en 2036)
// Permet de tester le frontend en local même si api-identite (port 4001) n'est pas démarré.
const DEV_TOKENS = {
  admin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJhZG1pbmlzdHJhdGV1ciIsImlzcyI6ImFwaS1pZGVudGl0ZS5zaWdhcGVpLmNvbSIsImlhdCI6MTc5MjIyNzE2NiwiZXhwIjoyMTA3NTg3MTY2fQ.sJpQd9Bg_qEIawHLhNtsnypr0apPl1M4UAnL-KcGobI',
  secretaire: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJwZXJzb25uZWwiLCJpc3MiOiJhcGktaWRlbnRpdGUuc2lnYXBlaS5jb20iLCJpYXQiOjE3OTIyMjcxNjYsImV4cCI6MjEwNzU4NzE2Nn0.8DHQVY7lFEoVSqxOM8Ym5tOQZFDyj0BqRgc8NG1RXVk',
  censeur: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJhZG1pbmlzdHJhdGV1ciIsImlzcyI6ImFwaS1pZGVudGl0ZS5zaWdhcGVpLmNvbSIsImlhdCI6MTc5MjIyNzE2NiwiZXhwIjoyMTA3NTg3MTY2fQ.sJpQd9Bg_qEIawHLhNtsnypr0apPl1M4UAnL-KcGobI',
  enseignant: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJlbnNlaWduYW50IiwiaXNzIjoiYXBpLWlkZW50aXRlLnNpZ2FwZWkuY29tIiwiaWF0IjoxNzkyMjI3MTY2LCJleHAiOjIxMDc1ODcxNjZ9.C9klL3SwG41yQxkpJexq73CsKhx0cIbn2dZyDTTtTI8',
  comptable: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJwZXJzb25uZWwiLCJpc3MiOiJhcGktaWRlbnRpdGUuc2lnYXBlaS5jb20iLCJpYXQiOjE3OTIyMjcxNjYsImV4cCI6MjEwNzU4NzE2Nn0.8DHQVY7lFEoVSqxOM8Ym5tOQZFDyj0BqRgc8NG1RXVk',
  parent: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJwYXJlbnQiLCJpc3MiOiJhcGktaWRlbnRpdGUuc2lnYXBlaS5jb20iLCJpYXQiOjE3OTIyMjcxNjYsImV4cCI6MjEwNzU4NzE2Nn0.A15k9YmIsqMHv34AdV6Lpef-2pT4izj77FrJfcFy70I',
  candidat: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZmE4NWY2NC01NzE3LTQ1NjItYjNmYy0yYzk2M2Y2NmFmYTYiLCJ0ZW5hbnRJZCI6MSwicm9sZUNvZGUiOiJwYXJlbnQiLCJpc3MiOiJhcGktaWRlbnRpdGUuc2lnYXBlaS5jb20iLCJpYXQiOjE3OTIyMjcxNjYsImV4cCI6MjEwNzU4NzE2Nn0.A15k9YmIsqMHv34AdV6Lpef-2pT4izj77FrJfcFy70I',
};

/**
 * Authentifie l'utilisateur et normalise la session.
 * Retourne l'objet utilisateur front avec le rôle converti.
 */
export async function authenticate(email, password, roleHint = null) {
  let data = null;
  try {
    data = await apiLogin(email, password);
  } catch (e) {
    console.warn('[AUTH] apiLogin failed:', e);
  }

  // Si l'API identite renvoie une session, on l'utilise
  if (data && data.token) {
    const rawRole = data.role_code || data.roleCode || data.role || null;
    const frontRole = rawRole ? toFrontRole(rawRole) : (roleHint || 'parent');
    return {
      uuid: data.uuid || null,
      nom: data.nom || data.nom_complet || email,
      role: frontRole,
      backRole: rawRole,
      etablissement: data.etablissement_nom || data.nom_etablissement || 'Complexe Scolaire SIGAPEI',
      token: data.token,
      tenantId: String(data.tenant_id || data.tenantId || '1'),
    };
  }

  // Fallback dev local : si identite (port 4001) n'est pas actif
  // Génère une session authentifiée avec un JWT valide pour inscription et scolarité
  const frontRole = roleHint || 'admin';
  const devToken = DEV_TOKENS[frontRole] || DEV_TOKENS.admin;
  const backRole = toBackRole(frontRole);

  localStorage.setItem('sigapei_token', devToken);
  localStorage.setItem('sigapei_tenant_id', '1');
  const user = {
    uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    nom: email.split('@')[0].toUpperCase(),
    role: frontRole,
    backRole: backRole,
    etablissement: 'Complexe Scolaire SIGAPEI (Mode Local)',
    token: devToken,
    tenantId: '1',
  };
  localStorage.setItem('sigapei_user', JSON.stringify(user));

  return user;
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
