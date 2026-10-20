/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { useNotify } from '../../context/commun/NotifyContext'
import Loader from '../commun/Loader'
import { LOGIN_PATH, redirectionPostLogin, roleCodeOf } from '../../config/identite/routes'

export const roleOf = (u) => u?.role?.code ?? u?.roleCode ?? (typeof u?.role === 'string' ? u.role : undefined)

/**
 * GARDE D'AUTHENTIFICATION
 *
 * - Non connecté      → notification + redirect /login
 * - Rôle insuffisant  → notification + redirect vers l'accueil du rôle
 * - Session en cours  → Loader animé
 */
export default function RequireAuth({ children, roles }) {
  const { status, user, logoutReason } = useAuth()
  const notify   = useNotify()
  const location = useLocation()
  const [notifiedUnauth, setNotifiedUnauth] = useState(false)
  const [notifiedForbid, setNotifiedForbid] = useState(false)

  if (status === 'loading') return <Loader label="Chargement de votre session…" />

  /* ── Non connecté ── */
  if (status !== 'authenticated') {
    if (logoutReason) return <Loader label="Redirection en cours…" />
    if (!notifiedUnauth) {
      setNotifiedUnauth(true)
      notify.warning('Connexion requise', 'Vous devez être connecté pour accéder à cette page.')
    }
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />
  }

  /* ── Connecté mais rôle insuffisant ── */
  if (roles?.length && !roles.includes(roleOf(user))) {
    if (!notifiedForbid) {
      setNotifiedForbid(true)
      const roleCode = roleCodeOf(user)
      notify.error(
        'Accès refusé',
        `Votre rôle « ${roleCode.replace(/_/g, ' ')} » ne vous permet pas d'accéder à cette page.`,
      )
    }
    return <Navigate to={redirectionPostLogin(roleCodeOf(user))} replace />
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
