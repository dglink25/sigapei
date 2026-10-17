import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { ADMIN_DASHBOARD_PATH, roleCodeOf } from '../../config/identite/routes'
import RequireAuth from './RequireAuth'

function ExclureSuperAdmin() {
  const { user } = useAuth()
  if (roleCodeOf(user) === 'super_admin') return <Navigate to={ADMIN_DASHBOARD_PATH} replace />
  return <Outlet />
}

/** Garde des espaces d'établissement : tout compte connecté, sauf le super administrateur (qui a l'administration). */
export default function RequireEtablissement() {
  return (
    <RequireAuth>
      <ExclureSuperAdmin />
    </RequireAuth>
  )
}
