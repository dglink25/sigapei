const KEYS = { access: 'sigapei.at', refresh: 'sigapei.rt', user: 'sigapei.user' }

const read = (k) => {
  try { return localStorage.getItem(k) } catch { return null }
}
const write = (k, v) => {
  try { localStorage.setItem(k, v) } catch { /* stockage indisponible */ }
}
const remove = (k) => {
  try { localStorage.removeItem(k) } catch { /* ignore */ }
}

export function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Normalise la reponse d'un endpoint de connexion (tolerant sur le nommage). */
export function extractSession(raw) {
  const d = raw?.data ?? raw ?? {}
  const t = d.tokens ?? d
  return {
    accessToken: t.accessToken ?? t.access_token ?? t.token ?? null,
    refreshToken: t.refreshToken ?? t.refresh_token ?? null,
    user: d.utilisateur ?? d.user ?? d.profil ?? null,
  }
}

export const tokenStore = {
  KEYS,
  getAccess: () => read(KEYS.access),
  getRefresh: () => read(KEYS.refresh),
  getUser() {
    try { return JSON.parse(read(KEYS.user)) } catch { return null }
  },
  setUser: (u) => (u ? write(KEYS.user, JSON.stringify(u)) : remove(KEYS.user)),
  set({ accessToken, refreshToken }) {
    if (accessToken) write(KEYS.access, accessToken)
    if (refreshToken) write(KEYS.refresh, refreshToken)
  },
  clear() {
    Object.values(KEYS).forEach(remove)
  },
  /** Date d'expiration (ms) du jeton d'acces, ou null. */
  expiresAt() {
    const p = decodeJwt(this.getAccess() ?? '')
    return p?.exp ? p.exp * 1000 : null
  },
}
