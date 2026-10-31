import { Bell } from 'lucide-react'
import { useNotification } from '../../context/commun/NotificationContext'
import './NotificationDrawer.css'

export default function NotificationBell({ className = '', size = 19, title = 'Notifications' }) {
  const { nbNonLues, ouvrir } = useNotification()

  return (
    <button
      type="button"
      className={`sg-notif-bell-btn ${className}`}
      onClick={ouvrir}
      title={title}
      aria-label={`${title} (${nbNonLues} non lue${nbNonLues > 1 ? 's' : ''})`}
    >
      <Bell size={size} aria-hidden="true" />
      {nbNonLues > 0 && (
        <span className="sg-notif-badge" aria-hidden="true">
          {nbNonLues > 99 ? '99+' : nbNonLues}
        </span>
      )}
    </button>
  )
}
