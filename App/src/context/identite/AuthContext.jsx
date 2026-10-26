/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ENV } from '../../config/commun/env'
import { ApiError, refreshSession, unwrap } from '../../lib/commun/http'
import { useNotify } from '../commun/NotifyContext'
import { authService } from '../../services/identite/auth.service'
import { authEvents } from '../../lib/identite/authEvents'
import { extractSession, tokenStore, decodeJwt } from '../../lib/identite/tokenStore'
import { urlEtablissement, urlPlateforme, MODE_SOUS_DOMAINE, detecterSlugEtablissement, lireSlugEtablissementCache, effacerSlugEtablissementCache } from '../../lib/etablissements/subdomain'
import { LOGIN_PATH, HOME_PATH } from '../../config/identite/routes'

const AuthContext = createContext(null)

const ACTIVITY_KEY = 'sigapei.activity'
const IDLE_MS = ENV.idleMinutes * 60 * 1000
const WARN_MS = 60 * 1000

const LOGOUT_MESSAGES = {
  manual:  ['success', 'Déconnexion réussie',          'Votre session a été fermée en toute sécurité.'],
  idle:    ['warning', 'Session fermée pour inactivité', `Pour votre sécurité, vous avez été déconnecté après ${ENV.idleMinutes} minutes d'inactivité.`],
  expired: ['warning', 'Session expirée',               'Votre session a expiré. Veuillez vous reconnecter.'],
  other:   ['info',    'Déconnexion',                   'Vous avez été déconnecté depuis un autre onglet.'],
}

const touch = () => {
  try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())) } catch { /* ignore */ }
}

/**
 * URL de redirection après déconnexion.
 *
 * - manual → accueil contextuel :
 *     super_admin      → racine de la plateforme  (/)
 *     utilisateur etab → accueil public de son établissement
 *     fallback         → racine de la plateforme
 *
 * - expired / idle / other → /login pour permettre la reconnexion,
 *   RequireAuth transmettra automatiquement « from » pour retourner
 *   sur la page en cours après une nouvelle connexion.
 */
function urlApresDeconnexion(reason, userSnapshot) {
  if (reason !== 'manual') return LOGIN_PATH

  const payload  = decodeJwt(tokenStore.getAccess() ?? '')
  const roleCode = payload?.roleCode ?? payload?.role ?? ''

  if (roleCode === 'super_admin') return urlPlateforme(HOME_PATH)

  // 1. Sous-domaine : on est déjà sur le bon sous-domaine
  if (MODE_SOUS_DOMAINE) {
    const slug = detecterSlugEtablissement()
    if (slug) return urlEtablissement(slug)
  }

  // 2. Cache localStorage (sauvegardé lors du chargement du portail)
  const slugCache = lireSlugEtablissementCache()
  if (slugCache) return urlEtablissement(slugCache)

  // 3. Fallback : slug dans l'objet user
  const slug = userSnapshot?.etablissement?.slug ?? userSnapshot?.slug ?? null
  if (slug) return urlEtablissement(slug)

  return urlPlateforme(HOME_PATH)
}

/**
 * Contexte de session.
 *
 * Déconnexion volontaire  → redirige vers l'accueil adapté au rôle/contexte.
 * Session expirée / idle  → redirige vers /login (RequireAuth conserve « from »).
 * Redirection interne     → window.location.assign() pour traverser les origines
 *   (sous-domaine établissement ↔ domaine plateforme en production).
 */
export function AuthProvider({ children }) {
  const notify  = useNotify()
  const [user,         setUser]         = useState(() => tokenStore.getUser())
  const [status,       setStatus]       = useState(() => (tokenStore.getAccess() ? 'loading' : 'anonymous'))
  const [logoutReason, setLogoutReason] = useState(null)
  const [tick,         setTick]         = useState(0)
  const closing = useRef(false)

  /* ── Fermeture de session + redirection ── */
  const terminate = useCallback(
    (reason, userSnap) => {
      if (closing.current) return
      closing.current = true

      // Calculer la destination AVANT de vider le token
      const dest = urlApresDeconnexion(reason, userSnap)

      tokenStore.clear()
      effacerSlugEtablissementCache()
      setUser(null)
      setLogoutReason(reason)
      setStatus('anonymous')

      const [type, title, msg] = LOGOUT_MESSAGES[reason] ?? LOGOUT_MESSAGES.expired
      notify[type](title, msg)

      // Redirection après un court délai pour laisser le modal s'afficher
      setTimeout(() => {
        closing.current = false
        window.location.assign(dest)
      }, 600)
    },
    [notify],
  )

  const logout = useCallback(
    async (reason = 'manual') => {
      if (closing.current) return
      // Capturer le snapshot user avant terminate() qui le vide
      const userSnap = tokenStore.getUser()
      if (reason === 'manual' || reason === 'idle') {
        await Promise.race([authService.logout().catch(() => {}), new Promise((r) => setTimeout(r, 3000))])
      }
      terminate(reason, userSnap)
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
      terminate('idle', tokenStore.getUser())
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

  /* 2. Événements HTTP */
  useEffect(() => {
    const offExpired  = authEvents.on('expired',   () => terminate('expired', tokenStore.getUser()))
    const offRefreshed = authEvents.on('refreshed', () => setTick((t) => t + 1))
    return () => { offExpired(); offRefreshed() }
  }, [terminate])

  /* 3. Déconnexion synchronisée entre onglets */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === tokenStore.KEYS.access && e.newValue === null && status === 'authenticated')
        terminate('other', tokenStore.getUser())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [status, terminate])

  /* 4. Rafraîchissement automatique du jeton */
  useEffect(() => {
    if (status !== 'authenticated') return undefined
    const exp = tokenStore.expiresAt()
    if (!exp) return undefined
    const delay = Math.max(exp - Date.now() - 60_000, 5_000)
    const t = setTimeout(async () => {
      if (!(await refreshSession())) terminate('expired', tokenStore.getUser())
    }, delay)
    return () => clearTimeout(t)
  }, [status, tick, terminate])

  /* 5. Déconnexion automatique pour inactivité */
  useEffect(() => {
    if (status !== 'authenticated') return undefined
    let lastWrite = 0
    let warned    = false
    const mark = () => {
      warned = false
      const now = Date.now()
      if (now - lastWrite > 5000) { lastWrite = now; touch() }
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
