
const BASE_DOMAIN = (import.meta.env.VITE_BASE_DOMAIN || '').trim()

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
