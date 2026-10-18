import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ENV } from '../../config/commun/env'
import { ApiError, refreshSession, unwrap } from '../../lib/commun/http'
import { useNotify } from '../commun/NotifyContext'
import { authService } from '../../services/identite/auth.service'
import { authEvents } from '../../lib/identite/authEvents'
import { extractSession, tokenStore } from '../../lib/identite/tokenStore'

const AuthContext = createContext(null)

const ACTIVITY_KEY = 'sigapei.activity'
const IDLE_MS = ENV.idleMinutes * 60 * 1000
const WARN_MS = 60 * 1000

const LOGOUT_MESSAGES = {
  manual: ['success', 'Déconnexion réussie', 'Votre session a été fermée en toute sécurité.'],
  idle: ['warning', 'Session fermée pour inactivité', `Pour votre sécurité, vous avez été déconnecté après ${ENV.idleMinutes} minutes d'inactivité.`],
  expired: ['warning', 'Session expirée', 'Votre session a expiré. Veuillez vous reconnecter.'],
  other: ['info', 'Déconnexion', 'Vous avez été déconnecté depuis un autre onglet.'],
}

const touch = () => {
  try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())) } catch { /* ignore */ }
}

/**
 * Etat de session. La REDIRECTION vers /login n'est pas faite ici :
 * elle est assuree par <RequireAuth />, present sur chaque page protegee.
 */
export function AuthProvider({ children }) {
  const notify = useNotify()
  const [user, setUser] = useState(() => tokenStore.getUser())
  const [status, setStatus] = useState(() => (tokenStore.getAccess() ? 'loading' : 'anonymous'))
  const [logoutReason, setLogoutReason] = useState(null)
  const [tick, setTick] = useState(0)
  const closing = useRef(false)

  /* Fermeture locale de session */
  const terminate = useCallback(
    (reason) => {
      if (closing.current) return
      closing.current = true
      tokenStore.clear()
      setUser(null)
      setLogoutReason(reason)
      setStatus('anonymous')
      const [type, title, msg] = LOGOUT_MESSAGES[reason] ?? LOGOUT_MESSAGES.expired
      notify[type](title, msg)
      setTimeout(() => { closing.current = false }, 500)
    },
    [notify],
  )

  const logout = useCallback(
    async (reason = 'manual') => {
      if (closing.current) return
      if (reason === 'manual' || reason === 'idle') {
        // Revocation cote serveur (liste noire du jeton), sans bloquer plus de 3 s
        await Promise.race([authService.logout().catch(() => {}), new Promise((r) => setTimeout(r, 3000))])
      }
      terminate(reason)
    },
    [terminate],
  )

  const login = useCallback(async (rawSession) => {
    const s = extractSession(rawSession)
    if (!s.accessToken) {
      throw new ApiError({ kind: 'session', title: 'Connexion impossible', message: "Le serveur n'a pas renvoyé de jeton de session valide." })
    }
    tokenStore.set(s)
    try {
      const u = s.user ?? unwrap(await authService.me())
      tokenStore.setUser(u)
      setUser(u)
      setLogoutReason(null)
      setStatus('authenticated')
      closing.current = false
      touch()
      return u
    } catch (err) {
      tokenStore.clear()
      throw err
    }
  }, [])

  /* 1. Restauration de la session au chargement */
  useEffect(() => {
    if (!tokenStore.getAccess()) return undefined
    const last = Number(localStorage.getItem(ACTIVITY_KEY)) || 0
    if (last && Date.now() - last > IDLE_MS) {
      terminate('idle')
      return undefined
    }
    let alive = true
    authService
      .me()
      .then((r) => {
        if (!alive) return
        const u = unwrap(r)
        tokenStore.setUser(u)
        setUser(u)
        setStatus('authenticated')
      })
      .catch((err) => {
        if (!alive) return
        if (err?.kind === 'network' || err?.kind === 'timeout') {
          // Serveur injoignable : on conserve la session locale si un profil est en cache
          if (tokenStore.getUser()) setStatus('authenticated')
          else { tokenStore.clear(); setStatus('anonymous') }
        } else if (!err?.sessionExpired) {
          tokenStore.clear()
          setUser(null)
          setStatus('anonymous')
        }
      })
    return () => { alive = false }
  }, [terminate])

  /* 2. Evenements emis par le client HTTP */
  useEffect(() => {
    const offExpired = authEvents.on('expired', () => terminate('expired'))
    const offRefreshed = authEvents.on('refreshed', () => setTick((t) => t + 1))
    return () => { offExpired(); offRefreshed() }
  }, [terminate])

  /* 3. Deconnexion synchronisee entre onglets */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === tokenStore.KEYS.access && e.newValue === null && status === 'authenticated') terminate('other')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [status, terminate])

  /* 4. Rafraichissement automatique du jeton avant expiration */
  useEffect(() => {
    if (status !== 'authenticated') return undefined
    const exp = tokenStore.expiresAt()
    if (!exp) return undefined
    const delay = Math.max(exp - Date.now() - 60_000, 5_000)
    const t = setTimeout(async () => {
      if (!(await refreshSession())) terminate('expired')
    }, delay)
    return () => clearTimeout(t)
  }, [status, tick, terminate])

  /* 5. Deconnexion automatique pour inactivite */
  useEffect(() => {
    if (status !== 'authenticated') return undefined
    let lastWrite = 0
    let warned = false
    const mark = () => {
      warned = false
      const now = Date.now()
      if (now - lastWrite > 5000) {
        lastWrite = now
        touch()
      }
    }
    mark()
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }))
    const timer = setInterval(() => {
      const last = Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now()
      const idle = Date.now() - last
      if (idle >= IDLE_MS) logout('idle')
      else if (idle >= IDLE_MS - WARN_MS && !warned) {
        warned = true
        notify.warning('Inactivité détectée', "Sans activité, vous serez déconnecté dans moins d'une minute.")
      }
    }, 5000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark))
      clearInterval(timer)
    }
  }, [status, logout, notify])

  const value = useMemo(
    () => ({ user, status, logoutReason, isAuthenticated: status === 'authenticated', login, logout }),
    [user, status, logoutReason, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit etre utilise dans <AuthProvider>')
  return ctx
}
