import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './commun/Loader'

export const roleOf = (u) => u?.role?.code ?? u?.roleCode ?? (typeof u?.role === 'string' ? u.role : undefined)

/** Reserve aux utilisateurs connectes ; `roles` restreint eventuellement a certains roles. */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Loader label="Chargement de votre session…" />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />
  if (roles?.length && !roles.includes(roleOf(user))) return <Navigate to="/acces-refuse" replace />
  return <Outlet />
}

/** Pages reservees aux visiteurs (login) : renvoie vers l'accueil si deja connecte. */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Loader label="Chargement de votre session…" />
  if (status === 'authenticated') return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  return <Outlet />
}
