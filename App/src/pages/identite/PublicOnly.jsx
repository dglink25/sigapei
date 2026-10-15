import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Splash from './Splash'
import { HOME_PATH } from './config'

/** Pages reservees aux visiteurs (ex. /login) : un utilisateur deja connecte est renvoye vers l'application. */
export default function PublicOnly({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'authenticated') {
    const from = location.state?.from
    const target = from ? from.pathname + (from.search ?? '') + (from.hash ?? '') : HOME_PATH
    return <Navigate to={target} replace />
  }
  return children ?? <Outlet />
}
