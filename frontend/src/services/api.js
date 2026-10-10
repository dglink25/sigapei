/**
 * Client API SIGAPEI Frontend
 * Gère la communication avec les microservices Inscription (port 4003) et Scolarité (port 4004).
 * Attache automatiquement le Bearer token JWT et le header X-Tenant-Id.
 */

const API_INSCRIPTION_URL = import.meta.env?.VITE_API_INSCRIPTION_URL || 'http://localhost:4003/v1';
const API_SCOLARITE_URL   = import.meta.env?.VITE_API_SCOLARITE_URL   || 'http://localhost:4004/v1';
const API_IDENTITE_URL    = import.meta.env?.VITE_API_IDENTITE_URL    || 'http://localhost:4001/v1';

function getHeaders() {
  const token = localStorage.getItem('sigapei_token') || '';
  const tenantId = localStorage.getItem('sigapei_tenant_id') || '1';

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Tenant-Id': String(tenantId),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseResponse(res) {
  return res.json().catch(() => ({}));
}

function handleError(res, err) {
  if (err?.message) throw new Error(err.message);
  if (err?.erreur) throw new Error(err.erreur);
  throw new Error(`Erreur HTTP ${res.status}`);
}

// ─── AUTH ─────────────────────────────────────────────────────────

/**
 * Authentifie un utilisateur auprès du microservice Identité.
 * Stocke le token JWT et le tenant_id dans localStorage.
 */
export async function login(email, password) {
  try {
    const res = await fetch(`${API_IDENTITE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, motDePasse: password }),
    });

    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);

    if (data.token) {
      localStorage.setItem('sigapei_token', data.token);
      localStorage.setItem('sigapei_tenant_id', String(data.tenant_id || '1'));
      localStorage.setItem('sigapei_user', JSON.stringify({
        uuid: data.uuid || null,
        nom: data.nom || data.nom_complet || email,
        role: data.role_code || data.roleCode || 'parent',
        etablissement: data.etablissement_nom || data.nom_etablissement || '',
      }));
      return data;
    }

    // Fallback : le backend identite n'est pas encore prêt, mode dégradé
    console.warn('[API] Identite non disponible, mode degrade.');
    return null;
  } catch (e) {
    console.warn('[API] Login impossible:', e.message);
    return null;
  }
}

export function logout() {
  localStorage.removeItem('sigapei_token');
  localStorage.removeItem('sigapei_tenant_id');
  localStorage.removeItem('sigapei_user');
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('sigapei_user') || 'null');
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('sigapei_token');
}

// ─── CANDIDATURES (Microservice Inscription) ─────────────────────

/**
 * Liste les candidatures avec filtres optionnels.
 * @param {Object} filtres - { statut, classe_visee_id, recherche }
 */
export async function listerCandidatures(filtres = {}) {
  const params = new URLSearchParams();
  Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  const res = await fetch(`${API_INSCRIPTION_URL}/candidatures${qs ? '?' + qs : ''}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error((await parseResponse(res)).erreur || `Erreur HTTP ${res.status}`);
  return parseResponse(res);
}

/**
 * Soumet une nouvelle candidature (POST /v1/candidatures).
 * Mapping champs front → back :
 *   classe_id       → classe_visee_id
 *   parent_tel      → parent_telephone
 *   parent_adresse  → (non stocké en back, ignoré)
 */
export async function soumettreCandidature(donnees) {
  const body = {
    nom: donnees.nom,
    prenom: donnees.prenom,
    sexe: donnees.sexe,
    date_naissance: donnees.date_naissance,
    email: donnees.email || null,
    telephone: donnees.telephone || null,
    adresse: donnees.adresse || null,
    classe_visee_id: Number(donnees.classe_id || donnees.classe_visee_id),
    parent_nom: donnees.parent_nom || null,
    parent_prenom: donnees.parent_prenom || null,
    parent_telephone: donnees.parent_tel || donnees.parent_telephone || null,
    parent_email: donnees.parent_email || null,
    parent_lien: donnees.parent_lien || 'parent',
  };

  const res = await fetch(`${API_INSCRIPTION_URL}/candidatures`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);
  return data;
}

/**
 * Valide définitivement une candidature.
 * @param {string} uuid - UUID de la candidature
 * @returns {Promise<{donnees: Object, erreur: string|null}>}
 */
export async function validerCandidature(uuid) {
  try {
    const res = await fetch(`${API_INSCRIPTION_URL}/candidatures/${uuid}/valider`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await parseResponse(res);
    if (!res.ok) return { erreur: data.erreur || data.message || `Erreur HTTP ${res.status}`, donnees: null };
    return { erreur: null, donnees: data.donnees || data };
  } catch (e) {
    return { erreur: e.message, donnees: null };
  }
}

/**
 * Rejette une candidature avec motif obligatoire.
 */
export async function rejeterCandidature(uuid, motif) {
  try {
    const res = await fetch(`${API_INSCRIPTION_URL}/candidatures/${uuid}/rejeter`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ motif }),
    });
    const data = await parseResponse(res);
    if (!res.ok) return { erreur: data.erreur || data.message || `Erreur HTTP ${res.status}`, donnees: null };
    return { erreur: null, donnees: data.donnees || data };
  } catch (e) {
    return { erreur: e.message, donnees: null };
  }
}

/**
 * Réinscrit un apprenant existant sur une nouvelle année scolaire.
 */
export async function reinscrireApprenant(donnees) {
  const body = {
    apprenant_uuid: donnees.apprenant_uuid || null,
    nouvelle_classe_uuid: donnees.nouvelle_classe_uuid || null,
    annee_scolaire: donnees.annee_scolaire,
  };
  const res = await fetch(`${API_INSCRIPTION_URL}/reinscriptions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);
  return data;
}

// ─── SCOLARITÉ (Microservice Scolarité) ─────────────────────────

/**
 * Liste les classes avec programme et capacité.
 */
export async function listerClasses() {
  const res = await fetch(`${API_SCOLARITE_URL}/classes`, { headers: getHeaders() });
  if (!res.ok) throw new Error((await parseResponse(res)).erreur || `Erreur HTTP ${res.status}`);
  return parseResponse(res);
}

/**
 * Crée une nouvelle classe.
 */
export async function creerClasse(donnees) {
  const res = await fetch(`${API_SCOLARITE_URL}/classes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(donnees),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);
  return data;
}

/**
 * Vérifie la disponibilité de place dans une classe.
 */
export async function verifierDisponibilite(classeUuid) {
  const res = await fetch(`${API_SCOLARITE_URL}/classes/${classeUuid}/disponibilite`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error((await parseResponse(res)).erreur || `Erreur HTTP ${res.status}`);
  return parseResponse(res);
}

/**
 * Transfère un apprenant vers une nouvelle classe (sans duplication).
 */
export async function transfererApprenant(apprenantUuid, nouvelleClasseUuid, motif = '') {
  try {
    const res = await fetch(`${API_SCOLARITE_URL}/apprenants/${apprenantUuid}/transfert`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nouvelle_classe_uuid: nouvelleClasseUuid, motif }),
    });
    const data = await parseResponse(res);
    if (!res.ok) return { erreur: data.erreur || data.message || `Erreur HTTP ${res.status}`, donnees: null };
    return { erreur: null, donnees: data.donnees || data };
  } catch (e) {
    return { erreur: e.message, donnees: null };
  }
}

/**
 * Liste les emplois du temps avec filtres optionnels.
 */
export async function listerEmploisDuTemps(filtres = {}) {
  const params = new URLSearchParams();
  Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v); });
  const qs = params.toString();
  const res = await fetch(`${API_SCOLARITE_URL}/emplois-du-temps${qs ? '?' + qs : ''}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error((await parseResponse(res)).erreur || `Erreur HTTP ${res.status}`);
  return parseResponse(res);
}

/**
 * Crée ou modifie un créneau d'emploi du temps.
 */
export async function enregistrerCreneauEdt(donnees) {
  const res = await fetch(`${API_SCOLARITE_URL}/emplois-du-temps`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(donnees),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);
  return data;
}

// ─── Alias rétrocompatibles ───────────────────────────────────────

export const api = {
  listerCandidatures,
  validerCandidature,
  rejeterCandidature,
  reinscrireApprenant,
  listerClasses,
  transfererApprenant,
  listerEmploisDuTemps,
  enregistrerCreneauEdt,
};
