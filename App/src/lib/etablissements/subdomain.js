import { LOGIN_PATH } from '../../config/identite/routes'

const BASE_DOMAIN = (import.meta.env.VITE_BASE_DOMAIN || '').trim()

/* ── Cache local du slug établissement ── */
const SLUG_KEY = 'sigapei.etab_slug'
export const sauvegarderSlugEtablissement = (slug) => {
  try { if (slug) localStorage.setItem(SLUG_KEY, slug) } catch { /* ignore */ }
}
export const lireSlugEtablissementCache = () => {
  try { return localStorage.getItem(SLUG_KEY) ?? null } catch { return null }
}
export const effacerSlugEtablissementCache = () => {
  try { localStorage.removeItem(SLUG_KEY) } catch { /* ignore */ }
}

/** Construit l'URL publique d'un établissement à partir de son slug. */
export function urlEtablissement(slug) {
  if (!slug) return '/'
  if (BASE_DOMAIN) {
    return `https://${slug}.${BASE_DOMAIN}`
  }
  return `/etablissements/${slug}`
}

/**
 * Détecte si la page courante est la page d'accueil d'un établissement.
 * Retourne le slug si oui, null sinon.
 */
export function detecterSlugEtablissement() {
  if (BASE_DOMAIN) {
    // Mode production : lire le sous-domaine
    const host      = window.location.hostname
    const parts     = host.split('.')
    const baseParts = BASE_DOMAIN.split('.')
    // Le sous-domaine est présent si hostname a plus de parties que le domaine de base
    if (parts.length > baseParts.length) {
      const sub = parts[0]
      if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
        return sub
      }
    }
    return null
  }
  // Mode développement : path /etablissements/{slug}
  const match = window.location.pathname.match(/^\/etablissements\/([^/]+)/)
  return match ? match[1] : null
}

/* ═══ Ajouts : contexte d'adresse plateforme / établissement (portail, redirections, liens) ═══
 *  - VITE_BASE_DOMAIN renseigné (ex. "sigapei.com") : mode SOUS-DOMAINE (production).
 *  - VITE_BASE_DOMAIN vide : mode LOCAL, les pages de l'établissement vivent sous /etablissements/:slug (même origine).
 * Tout le code passe par ces fonctions, jamais par une URL écrite en dur.
 */
export const MODE_SOUS_DOMAINE = BASE_DOMAIN !== ''

/** Préfixe des routes de l'établissement : '' sur un sous-domaine, '/etablissements/:slug' en local. */
export const BASE_ROUTE_ETABLISSEMENT = MODE_SOUS_DOMAINE ? '' : '/etablissements/:slug'

/** Lien interne (<Link>) vers une page de l'établissement courant. */
export function lienEtablissement(slug, sub = '') {
  return MODE_SOUS_DOMAINE ? sub || '/' : `/etablissements/${slug}${sub}`
}

/** URL absolue d'une page d'un établissement (changement d'origine possible en production). */
export function urlEtablissementAbsolue(slug, sub = '') {
  if (MODE_SOUS_DOMAINE) return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${sub}`
  return `${window.location.origin}/etablissements/${slug}${sub}`
}

/** URL absolue d'une page de la plateforme. */
export function urlPlateforme(path = '/') {
  return MODE_SOUS_DOMAINE ? `${window.location.protocol}//${BASE_DOMAIN}${path}` : path
}

/** Page de connexion (centrale, sur la plateforme) avec rappel de l'établissement d'origine. */
export function urlConnexion(slug) {
  return MODE_SOUS_DOMAINE
    ? `${urlPlateforme(LOGIN_PATH)}${slug ? `?etablissement=${encodeURIComponent(slug)}` : ''}`
    : LOGIN_PATH
}
