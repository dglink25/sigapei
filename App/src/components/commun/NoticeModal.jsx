import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, TriangleAlert, Info, X } from 'lucide-react'
import './NoticeModal.css'

const ICONS = { success: CircleCheck, error: CircleX, warning: TriangleAlert, info: Info }

export default function NoticeModal({ type = 'info', title, message, duration = 3000, onClose }) {
  const Icon = ICONS[type] ?? Info

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [duration, onClose])

  return createPortal(
    <div className="notice-overlay" onClick={onClose}>
      <div
        className={`notice notice--${type}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        aria-describedby={message ? 'notice-msg' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="notice-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <div className="notice-icon">
          <Icon size={36} strokeWidth={2.1} aria-hidden="true" />
        </div>
        <h2 id="notice-title" className="notice-title">{title}</h2>
        {message && <p id="notice-msg" className="notice-msg">{message}</p>}
        <div className="notice-progress" aria-hidden="true">
          <span style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
