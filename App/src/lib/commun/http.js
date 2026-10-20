import { ENV } from '../../config/commun/env'
import { tokenStore, extractSession } from '../identite/tokenStore'
import { authEvents } from '../identite/authEvents'

export class ApiError extends Error {
  constructor({ status = 0, kind = 'http', title = 'Erreur', message = '', details = null, sessionExpired = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
    this.title = title
    this.details = details
    this.sessionExpired = sessionExpired
  }
}

const COPY = {
  400: ['Demande invalide', 'Les informations transmises sont incorrectes ou incomplètes.'],
  401: ['Authentification requise', 'Vos informations de connexion sont invalides ou votre session a expiré.'],
  403: ['Accès refusé', "Vous n'êtes pas autorisé à effectuer cette action."],
  404: ['Ressource introuvable', 'Aucun compte ou ressource ne correspond à votre demande.'],
  409: ['Conflit de données', 'Cette opération entre en conflit avec une donnée existante.'],
  422: ['Données non valides', 'Certaines informations saisies ne sont pas valides.'],
  423: ['Compte verrouillé', 'Votre compte est temporairement verrouillé. Réessayez plus tard.'],
  429: ['Trop de tentatives', 'Veuillez patienter quelques instants avant de réessayer.'],
  500: ['Erreur du service', "Une erreur interne est survenue. Veuillez réessayer dans un instant."],
  503: ['Service indisponible', 'Le service est momentanément indisponible. Veuillez réessayer plus tard.'],
}
const GENERIC = new Set(['Unauthorized', 'Forbidden', 'Not Found', 'Bad Request', 'Conflict', 'Too Many Requests', 'Internal Server Error'])

const copyFor = (s) => COPY[s] ?? (s >= 500 ? COPY[503] : ['Requête refusée', "Le serveur n'a pas pu traiter votre demande."])

const CODE_TITLES = {
  CAPTCHA_INVALIDE:        'Vérification de sécurité',
  LIEN_CORRECTION_INVALIDE: 'Lien invalide',
  DONNEES_INVALIDES:       'Données invalides',
  RESSOURCE_INTROUVABLE:   'Ressource introuvable',
  SECRET_INTERNE_INVALIDE: 'Erreur de configuration',
}

const CODE_MESSAGES = {
  // Le 401 SECRET_INTERNE vient du proxy Vite mal configuré, pas d'une session expirée
  SECRET_INTERNE_INVALIDE: 'Le secret interne est manquant ou incorrect. Vérifiez ETAB_INTERNAL_SECRET dans le fichier .env et relancez le serveur de développement.',
}

function serverMessage(body) {
  const err = body?.error
  // { error: { details: { champ: ["message"] } } } -> premiere erreur de validation
  if (err?.details && typeof err.details === 'object') {
    const first = Object.values(err.details).flat()[0]
    if (first) return String(first)
  }
  if (typeof err?.message === 'string' && err.message) return err.message
  // Laravel brut : { errors: { champ: ["..."] } }
  if (body?.errors && typeof body.errors === 'object') {
    const first = Object.values(body.errors).flat()[0]
    if (first) return String(first)
  }
  const m = body?.message
  const txt = Array.isArray(m) ? m.join(' · ') : typeof m === 'string' ? m : ''
  return GENERIC.has(txt) ? '' : txt
}

export function buildError(status, body) {
  const [title, fallback] = copyFor(status)
  const code = body?.error?.code ?? null
  const srv = status < 500 ? serverMessage(body) : ''
  const message = CODE_MESSAGES[code] ?? (srv || fallback)
  const e = new ApiError({ status, title: CODE_TITLES[code] ?? title, message, details: body })
  e.code = code
  // SECRET_INTERNE_INVALIDE = problème de config proxy, PAS une expiration de session
  e.isInternalSecretError = code === 'SECRET_INTERNE_INVALIDE'
  return e
}

/** Les reponses peuvent etre enveloppees dans { data } : on tolere les deux formes. */
export const unwrap = (r) => (r && typeof r === 'object' && r.data !== undefined ? r.data : r)

/* ---- Rafraichissement du jeton (un seul appel a la fois) ---- */
let inflight = null
export function refreshSession() {
  if (inflight) return inflight
  inflight = (async () => {
    const refreshToken = tokenStore.getRefresh()
    if (!refreshToken) return false
    try {
      const res = await fetch(`${ENV.services.auth}${ENV.apiPrefix}/auth/token/rafraichir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(ENV.timeout),
      })
      if (!res.ok) return false
      const s = extractSession(await res.json())
      if (!s.accessToken) return false
      tokenStore.set(s)
      authEvents.emit('refreshed')
      return true
    } catch {
      return false
    }
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function createHttp(baseUrl) {
  const root = `${baseUrl}${ENV.apiPrefix}`

  async function request(method, path, { body, auth = true, retry = true, headers: extraHeaders = {} } = {}) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ENV.timeout)
    const headers = { Accept: 'application/json', ...extraHeaders }
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
    const token = auth ? tokenStore.getAccess() : null
    if (token) headers.Authorization = `Bearer ${token}`

    let res
    try {
      res = await fetch(root + path, {
        method,
        headers,
        body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
        signal: ctrl.signal,
      })
    } catch (err) {
      throw err?.name === 'AbortError'
        ? new ApiError({ kind: 'timeout', title: 'Délai dépassé', message: 'Le serveur met trop de temps à répondre. Veuillez réessayer.' })
        : new ApiError({ kind: 'network', title: 'Service injoignable', message: 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.' })
    } finally {
      clearTimeout(timer)
    }

    let sessionExpired = false
    if (res.status === 401 && auth && token && retry) {
      // Lire le corps d'abord pour détecter SECRET_INTERNE_INVALIDE avant de tenter un refresh
      const peekText = await res.text()
      let peekData
      try { peekData = peekText ? JSON.parse(peekText) : null } catch { peekData = null }

      const isSecretError = peekData?.error?.code === 'SECRET_INTERNE_INVALIDE'

      if (!isSecretError) {
        // Vrai 401 JWT : tenter un refresh
        if (await refreshSession()) return request(method, path, { body, auth, retry: false, headers: extraHeaders })
        sessionExpired = true
        authEvents.emit('expired')
      }

      // Construire l'erreur depuis le corps déjà lu
      if (!res.ok) {
        const err = buildError(res.status, peekData)
        err.sessionExpired = sessionExpired
        throw err
      }
      return peekData
    }

    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = null }

    if (!res.ok) {
      const err = buildError(res.status, data)
      err.sessionExpired = sessionExpired
      throw err
    }
    return data
  }

  return {
    get: (p, o) => request('GET', p, o),
    post: (p, b, o) => request('POST', p, { ...o, body: b }),
    put: (p, b, o) => request('PUT', p, { ...o, body: b }),
    patch: (p, b, o) => request('PATCH', p, { ...o, body: b }),
    delete: (p, o) => request('DELETE', p, o),
    /** Crée une instance avec des headers additionnels fixes (ex: X-User-Role, X-Tenant-Uuid). */
    withHeaders: (fixed) => ({
      get: (p, o) => request('GET', p, { ...o, headers: { ...fixed, ...(o?.headers ?? {}) } }),
      post: (p, b, o) => request('POST', p, { ...o, body: b, headers: { ...fixed, ...(o?.headers ?? {}) } }),
      put: (p, b, o) => request('PUT', p, { ...o, body: b, headers: { ...fixed, ...(o?.headers ?? {}) } }),
      patch: (p, b, o) => request('PATCH', p, { ...o, body: b, headers: { ...fixed, ...(o?.headers ?? {}) } }),
      delete: (p, o) => request('DELETE', p, { ...o, headers: { ...fixed, ...(o?.headers ?? {}) } }),
    }),
  }
}

export const authApi = createHttp(ENV.services.auth)

/** Clients des autres microservices (uniquement ceux dont l'URL est renseignee). */
export const serviceApi = Object.fromEntries(
  Object.entries(ENV.services)
    .filter(([, u]) => u)
    .map(([k, u]) => [k, createHttp(u)]),
)
