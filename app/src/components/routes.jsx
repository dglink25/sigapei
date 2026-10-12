import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ENV } from '../config/env'

export const roleOf = (u) => u?.role?.code ?? u?.roleCode ?? (typeof u?.role === 'string' ? u.role : undefined)

function Splash() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#fff6dd' }}>
      <div style={{ textAlign: 'center', color: '#006b3c', fontFamily: 'system-ui, sans-serif' }}>
        <img src="/sigapei.png" alt={ENV.appName} style={{ height: 64, marginBottom: 16 }} />
        <div style={{ fontWeight: 600 }}>Chargement de votre session…</div>
      </div>
    </div>
  )
}

/** Reserve aux utilisateurs connectes ; `roles` restreint eventuellement a certains roles. */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />
  if (roles?.length && !roles.includes(roleOf(user))) return <Navigate to="/acces-refuse" replace />
  return <Outlet />
}

/** Pages reservees aux visiteurs (login) : renvoie vers l'accueil si deja connecte. */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  return <Outlet />
}
