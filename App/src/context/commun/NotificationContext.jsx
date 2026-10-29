/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationService } from '../../services/commun/notification.service'
import { useAuth } from '../identite/AuthContext'
import { useNotify } from './NotifyContext'
import NotificationDrawer from '../../components/commun/NotificationDrawer'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()

  // Extraire le rôle actuel (super_admin, etablissement, parent, etc.)
  const userRole = useMemo(() => {
    return user?.roleCode || user?.role || (user?.roles && user.roles[0]) || ''
  }, [user])

  const [notifications, setNotifications] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const [selection, setSelection] = useState([])

  // Recharger les notifications selon l'utilisateur
  const recharger = useCallback(() => {
    const data = notificationService.obtenirNotifications(userRole)
    setNotifications(data)
  }, [userRole])

  useEffect(() => {
    recharger()
  }, [recharger])

  // Compteur de non-lues
  const nbNonLues = useMemo(() => {
    return notifications.filter((n) => !n.lu).length
  }, [notifications])

  const ouvrir = useCallback(() => setOuvert(true), [])
  const fermer = useCallback(() => {
    setOuvert(false)
    setSelection([])
  }, [])

  const marquerCommeLu = useCallback((id) => {
    notificationService.marquerCommeLu(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)))
  }, [])

  const marquerSelectionCommeLue = useCallback(() => {
    if (selection.length === 0) return
    notificationService.marquerSelectionCommeLue(selection)
    const setIds = new Set(selection)
    setNotifications((prev) => prev.map((n) => (setIds.has(n.id) ? { ...n, lu: true } : n)))
    setSelection([])
    notify.success('Notifications mises à jour', `${selection.length} notification(s) marquée(s) comme lue(s).`)
  }, [selection, notify])

  const marquerToutCommeLu = useCallback(() => {
    notificationService.marquerToutCommeLu(userRole)
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })))
    notify.info('Notifications lues', 'Toutes les notifications ont été marquées comme lues.')
  }, [userRole, notify])

  const supprimerNotification = useCallback((id) => {
    notificationService.supprimerNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setSelection((prev) => prev.filter((item) => item !== id))
  }, [])

  const supprimerSelection = useCallback(() => {
    if (selection.length === 0) return
    const nb = selection.length
    notificationService.supprimerSelection(selection)
    const setIds = new Set(selection)
    setNotifications((prev) => prev.filter((n) => !setIds.has(n.id)))
    setSelection([])
    notify.success('Suppression effectuée', `${nb} notification(s) supprimée(s).`)
  }, [selection, notify])

  const supprimerTout = useCallback(() => {
    notificationService.supprimerTout(userRole)
    setNotifications([])
    setSelection([])
    notify.info('Historique vidé', 'Toutes les notifications ont été supprimées.')
  }, [userRole, notify])

  const toggleSelection = useCallback((id) => {
    setSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const selectionnerTout = useCallback((ids) => {
    setSelection(ids)
  }, [])

  const viderSelection = useCallback(() => {
    setSelection([])
  }, [])

  /**
   * Clic sur une notification :
   * 1. Vérification stricte des droits d'accès
   * 2. Marquer comme lue
   * 3. Redirection vers la ressource
   */
  const cliquerNotification = useCallback(
    (notif) => {
      // 1. Contrôle d'habilitation
      if (notif.roleRequis && notif.roleRequis.length > 0) {
        const autorise = notif.roleRequis.includes(userRole)
        if (!autorise) {
          notify.error(
            'Accès restreint',
            "Vos habilitations actuelles ne vous autorisent pas à accéder à cette ressource d'administration."
          )
          return
        }
      }

      // 2. Marquer comme lue
      marquerCommeLu(notif.id)

      // 3. Fermer le tiroir
      fermer()

      // 4. Redirection vers le lien
      if (notif.lien) {
        navigate(notif.lien)
      }
    },
    [userRole, marquerCommeLu, fermer, navigate, notify]
  )

  const value = useMemo(
    () => ({
      notifications,
      nbNonLues,
      ouvert,
      selection,
      ouvrir,
      fermer,
      recharger,
      marquerCommeLu,
      marquerSelectionCommeLue,
      marquerToutCommeLu,
      supprimerNotification,
      supprimerSelection,
      supprimerTout,
      toggleSelection,
      selectionnerTout,
      viderSelection,
      cliquerNotification,
    }),
    [
      notifications,
      nbNonLues,
      ouvert,
      selection,
      ouvrir,
      fermer,
      recharger,
      marquerCommeLu,
      marquerSelectionCommeLue,
      marquerToutCommeLu,
      supprimerNotification,
      supprimerSelection,
      supprimerTout,
      toggleSelection,
      selectionnerTout,
      viderSelection,
      cliquerNotification,
    ]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationDrawer />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification doit être utilisé au sein de NotificationProvider')
  }
  return ctx
}
