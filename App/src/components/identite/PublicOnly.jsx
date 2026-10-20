import { useState } from 'react'
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
  const [notified, setNotified] = useState(false)

  if (status === 'loading') return <Loader label="Chargement de votre session…" />

  if (status === 'authenticated') {
    if (!notified) {
      setNotified(true)
      const nom = user?.nomComplet ?? user?.nom_complet ?? ''
      notify.info(
        'Session active',
        nom ? `Vous êtes connecté en tant que ${nom}.` : 'Vous êtes déjà connecté.',
      )
    }
    const from = location.state?.from
    const destination = from
      ? from.pathname + (from.search ?? '') + (from.hash ?? '')
      : redirectionPostLogin(roleCodeOf(user))
    return <Navigate to={destination} replace />
  }

  return children ?? <Outlet />
}
