import { ENV } from '../config/env'
import { tokenStore, extractSession } from '../pages/identite/lib/tokenStore'
import { authEvents } from '../pages/identite/lib/authEvents'
import { rateLimitGuard } from '../services/securite/rateLimitGuard.service'

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

function serverMessage(body) {
  const m = body?.message ?? body?.error?.message
  const txt = Array.isArray(m) ? m.join(' · ') : typeof m === 'string' ? m : ''
  return GENERIC.has(txt) ? '' : txt
}

function buildError(status, body) {
  const [title, fallback] = copyFor(status)
  const srv = status < 500 ? serverMessage(body) : ''
  return new ApiError({ status, title, message: srv || fallback, details: body })
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

  async function request(method, path, { body, auth = true, retry = true } = {}) {
    if (rateLimitGuard.isLocked()) {
      const remaining = rateLimitGuard.getRemainingSeconds()
      throw new ApiError({
        status: 429,
        kind: 'rate_limit',
        title: 'Sécurité : requêtes temporairement bloquées',
        message: `Trop de requêtes détectées (protection anti-surcharge). Veuillez patienter ${remaining} seconde(s) avant de soumettre une nouvelle requête.`,
      })
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ENV.timeout)
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = auth ? tokenStore.getAccess() : null
    if (token) headers.Authorization = `Bearer ${token}`
    const user = tokenStore.getUser()
    if (user?.tenant_id) headers['X-Tenant-ID'] = String(user.tenant_id)
    if (user?.role) headers['X-Role'] = String(user.role)

    let res
    try {
      res = await fetch(root + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      })
    } catch (err) {
      throw err?.name === 'AbortError'
        ? new ApiError({ kind: 'timeout', title: 'Délai dépassé', message: 'Le serveur met trop de temps à répondre. Veuillez réessayer.' })
        : new ApiError({ kind: 'network', title: 'Service injoignable', message: 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.' })
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 429) {
      const retryHeader = res.headers?.get?.('Retry-After')
      const retrySec = retryHeader ? parseInt(retryHeader, 10) : 60
      rateLimitGuard.lock(isNaN(retrySec) ? 60 : retrySec, 'Trop de requêtes ou tentatives détectées sur le serveur')
    }

    let sessionExpired = false
    if (res.status === 401 && auth && token && retry) {
      if (await refreshSession()) return request(method, path, { body, auth, retry: false })
      sessionExpired = true
      authEvents.emit('expired')
    }

    const text = await res.text()
    let data = null
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
  }
}

export const authApi = createHttp(ENV.services.auth)

/** Clients des autres microservices (uniquement ceux dont l'URL est renseignee). */
export const serviceApi = Object.fromEntries(
  Object.entries(ENV.services)
    .filter(([, u]) => u)
    .map(([k, u]) => [k, createHttp(u)]),
)
