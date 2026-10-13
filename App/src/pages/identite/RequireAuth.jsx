import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Splash from './Splash'
import { FORBIDDEN_PATH, LOGIN_PATH } from './config'

export const roleOf = (u) => u?.role?.code ?? u?.roleCode ?? (typeof u?.role === 'string' ? u.role : undefined)

/**
 * GARDE D'AUTHENTIFICATION - a utiliser sur n'importe quelle page.
 *
 *  - non connecte  -> redirection automatique vers /login (puis retour sur la page demandee apres connexion)
 *  - session perdue (expiration, inactivite, deconnexion depuis un autre onglet) -> meme redirection, en direct
 *  - `roles` (optionnel) : reserve la page a certains roles, sinon redirection vers /acces-refuse
 *
 * Trois facons de l'utiliser :
 *   1) Enveloppe :     <RequireAuth><MaPage /></RequireAuth>
 *   2) Route-layout :  <Route element={<RequireAuth />}> ...routes protegees... </Route>
 *   3) HOC :           export default withAuth(MaPage)
 */
export default function RequireAuth({ children, roles }) {
  const { status, user, logoutReason } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />

  if (status !== 'authenticated') {
    // Apres une deconnexion volontaire, on ne ramene pas l'utilisateur sur la page qu'il vient de quitter
    const from = logoutReason === 'manual' ? undefined : location
    return <Navigate to={LOGIN_PATH} replace state={{ from }} />
  }

  if (roles?.length && !roles.includes(roleOf(user))) return <Navigate to={FORBIDDEN_PATH} replace />

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
