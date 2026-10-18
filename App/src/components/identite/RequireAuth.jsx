import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { useNotify } from '../../context/commun/NotifyContext'
import Loader from '../commun/Loader'
import { FORBIDDEN_PATH, LOGIN_PATH, redirectionPostLogin, roleCodeOf } from '../../config/identite/routes'

export const roleOf = (u) => u?.role?.code ?? u?.roleCode ?? (typeof u?.role === 'string' ? u.role : undefined)

/**
 * GARDE D'AUTHENTIFICATION
 *
 * - Non connecté      → notification info + redirect /login (avec retour automatique après connexion)
 * - Rôle insuffisant  → notification warning + redirect vers la page d'accueil du rôle
 * - Session en cours  → Loader animé
 */
export default function RequireAuth({ children, roles }) {
  const { status, user, logoutReason } = useAuth()
  const notify  = useNotify()
  const location = useLocation()

  /* ── Refs pour n'envoyer la notif qu'une seule fois par tentative ── */
  const notifiedUnauth  = useRef(false)
  const notifiedForbid  = useRef(false)

  /* Reset quand la location change (nouvelle tentative d'accès) */
  useEffect(() => {
    notifiedUnauth.current = false
    notifiedForbid.current = false
  }, [location.pathname])

  if (status === 'loading') return <Loader label="Chargement de votre session…" />

  /* ── Non connecté ── */
  if (status !== 'authenticated') {
    if (!notifiedUnauth.current) {
      notifiedUnauth.current = true
      notify.warning(
        'Connexion requise',
        'Vous devez être connecté pour accéder à cette page.',
      )
    }
    const from = logoutReason === 'manual' ? undefined : location
    return <Navigate to={LOGIN_PATH} replace state={{ from }} />
  }

  /* ── Connecté mais rôle insuffisant ── */
  if (roles?.length && !roles.includes(roleOf(user))) {
    if (!notifiedForbid.current) {
      notifiedForbid.current = true
      const roleCode = roleCodeOf(user)
      notify.error(
        'Accès refusé',
        `Votre rôle « ${roleCode.replace(/_/g, ' ')} » ne vous permet pas d'accéder à cette page.`,
      )
    }
    /* Rediriger vers la bonne page d'accueil pour ce rôle */
    const destination = redirectionPostLogin(roleCodeOf(user))
    return <Navigate to={destination} replace />
  }

  return children ?? <Outlet />
}

/** HOC : export default withAuth(MaPage) ou withAuth(MaPage, { roles: ['administrateur'] }) */
export function withAuth(Component, options = {}) {
  function Protected(props) {
    return (
      <RequireAuth {...options}>
        <Component {...props} />
      </RequireAuth>
    )
  }
  Protected.displayName = `withAuth(${Component.displayName || Component.name || 'Page'})`
  return Protected
}
