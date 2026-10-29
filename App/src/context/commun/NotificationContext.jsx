import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationService } from '../../services/commun/notification.service'
import { realtimeService } from '../../services/commun/realtime.service'
import { pushNotificationService } from '../../services/commun/pushNotification.service'
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
  const [permissionPush, setPermissionPush] = useState(() => pushNotificationService.obtenirPermission())

  // Recharger les notifications selon l'utilisateur
  const recharger = useCallback(() => {
    const data = notificationService.obtenirNotifications(userRole)
    setNotifications(data)
  }, [userRole])

  useEffect(() => {
    recharger()
  }, [recharger])

  // Synchronisation en temps réel (multi-onglets et événements plateforme)
  useEffect(() => {
    const unsubNotif = realtimeService.abonner('NOUVELLE_NOTIFICATION', (nouvelle) => {
      const estSuperAdmin = userRole === 'super_admin'
      const concerne = estSuperAdmin
        ? nouvelle.roleRequis?.includes('super_admin') || nouvelle.categorie === 'securite' || nouvelle.type?.startsWith('DEMANDE_')
        : !nouvelle.roleRequis?.includes('super_admin')

      if (!concerne) return

      notificationService.ajouterNotification(nouvelle)
      setNotifications((prev) => [nouvelle, ...prev.filter((n) => n.id !== nouvelle.id)])

      // Déclencher Web Push et son discret institutionnel
      pushNotificationService.afficherNotificationPush(nouvelle.titre, {
        body: nouvelle.message,
        lien: nouvelle.lien,
        tag: nouvelle.id,
      })

      notify.info(nouvelle.titre, nouvelle.message)
    })

    const unsubLue = realtimeService.abonner('NOTIFICATION_LUE', ({ id }) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)))
    })

    const unsubSync = realtimeService.abonner('NOTIFICATIONS_SYNC', () => {
      recharger()
    })

    return () => {
      unsubNotif()
      unsubLue()
      unsubSync()
    }
  }, [userRole, recharger, notify])

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
    realtimeService.publier('NOTIFICATION_LUE', { id })
  }, [])

  const marquerSelectionCommeLue = useCallback(() => {
    if (selection.length === 0) return
    notificationService.marquerSelectionCommeLue(selection)
    const setIds = new Set(selection)
    setNotifications((prev) => prev.map((n) => (setIds.has(n.id) ? { ...n, lu: true } : n)))
    setSelection([])
    realtimeService.publier('NOTIFICATIONS_SYNC')
    notify.success('Notifications mises à jour', `${selection.length} notification(s) marquée(s) comme lue(s).`)
  }, [selection, notify])

  const marquerToutCommeLu = useCallback(() => {
    notificationService.marquerToutCommeLu(userRole)
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })))
    realtimeService.publier('NOTIFICATIONS_SYNC')
    notify.info('Notifications lues', 'Toutes les notifications ont été marquées comme lues.')
  }, [userRole, notify])

  const supprimerNotification = useCallback((id) => {
    notificationService.supprimerNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setSelection((prev) => prev.filter((item) => item !== id))
    realtimeService.publier('NOTIFICATIONS_SYNC')
  }, [])

  const supprimerSelection = useCallback(() => {
    if (selection.length === 0) return
    const nb = selection.length
    notificationService.supprimerSelection(selection)
    const setIds = new Set(selection)
    setNotifications((prev) => prev.filter((n) => !setIds.has(n.id)))
    setSelection([])
    realtimeService.publier('NOTIFICATIONS_SYNC')
    notify.success('Suppression effectuée', `${nb} notification(s) supprimée(s).`)
  }, [selection, notify])

  const supprimerTout = useCallback(() => {
    notificationService.supprimerTout(userRole)
    setNotifications([])
    setSelection([])
    realtimeService.publier('NOTIFICATIONS_SYNC')
    notify.info('Historique vidé', 'Toutes les notifications ont été supprimées.')
  }, [userRole, notify])

  const demanderPermissionPush = useCallback(async () => {
    const perm = await pushNotificationService.demanderPermission()
    setPermissionPush(perm)
    if (perm === 'granted') {
      notify.success('Notifications push activées', 'Vous recevrez désormais les alertes officielles directement sur votre appareil.')
      pushNotificationService.afficherNotificationPush('SIGAPEI - Notifications actives', {
        body: 'Le canal de communication temps réel et notifications push est opérationnel.',
        lien: '/',
      })
    } else if (perm === 'denied') {
      notify.warning('Notifications push bloquées', 'Veuillez autoriser les notifications dans les paramètres de votre navigateur pour recevoir les alertes directes.')
    }
    return perm
  }, [notify])

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
      permissionPush,
      demanderPermissionPush,
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
      permissionPush,
      demanderPermissionPush,
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
