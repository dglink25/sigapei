import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { useNotify } from '../../context/commun/NotifyContext'
import Loader from '../commun/Loader'
import { redirectionPostLogin, roleCodeOf } from '../../config/identite/routes'

/**
 * Pages réservées aux visiteurs (ex. /login).
 * Un utilisateur déjà connecté est redirigé vers son espace avec une notification info.
 */
export default function PublicOnly({ children }) {
  const { status, user } = useAuth()
  const notify   = useNotify()
  const location = useLocation()
  const notified = useRef(false)

  // La notification doit être déclenchée en dehors du rendu (useEffect)
  useEffect(() => {
    if (status === 'authenticated' && !notified.current) {
      notified.current = true
      const nom = user?.nomComplet ?? user?.nom_complet ?? ''
      notify.info(
        'Session active',
        nom ? `Vous êtes connecté en tant que ${nom}.` : 'Vous êtes déjà connecté.',
      )
    }
  }, [status, user, notify])

  if (status === 'loading') return <Loader label="Chargement de votre session…" />

  if (status === 'authenticated') {
    const from = location.state?.from
    const destination = from
      ? from.pathname + (from.search ?? '') + (from.hash ?? '')
      : redirectionPostLogin(roleCodeOf(user))
    return <Navigate to={destination} replace />
  }

  return children ?? <Outlet />
}
