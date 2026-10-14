import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './NoticeModal.css'

/* ─────────────────────────────────────────────────────────────
   Icônes SVG animées — grand cercle fil de fer + symbole centré
   r = 38 → circonférence = 2π×38 ≈ 238.76
───────────────────────────────────────────────────────────── */

function IconSuccess() {
  return (
    <svg className="nsvg" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="nsvg-circle nsvg-circle--success" cx="48" cy="48" r="38" />
      <polyline
        className="nsvg-mark nsvg-mark--check"
        points="28,50 42,64 68,32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconError() {
  return (
    <svg className="nsvg" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="nsvg-circle nsvg-circle--error" cx="48" cy="48" r="38" />
      <line className="nsvg-mark nsvg-mark--x1" x1="32" y1="32" x2="64" y2="64" strokeLinecap="round" />
      <line className="nsvg-mark nsvg-mark--x2" x1="64" y1="32" x2="32" y2="64" strokeLinecap="round" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg className="nsvg" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="nsvg-circle nsvg-circle--warning" cx="48" cy="48" r="38" />
      <line className="nsvg-mark nsvg-mark--stem" x1="48" y1="30" x2="48" y2="54" strokeLinecap="round" />
      <circle className="nsvg-dot nsvg-dot--warning" cx="48" cy="64" r="3" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg className="nsvg" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="nsvg-circle nsvg-circle--info" cx="48" cy="48" r="38" />
      <circle className="nsvg-dot nsvg-dot--info" cx="48" cy="32" r="3" />
      <line className="nsvg-mark nsvg-mark--stem" x1="48" y1="42" x2="48" y2="66" strokeLinecap="round" />
    </svg>
  )
}

const ICONS = {
  success: IconSuccess,
  error:   IconError,
  warning: IconWarning,
  info:    IconInfo,
}

export default function NoticeModal({ type = 'info', title, message, duration = 3000, onClose }) {
  const Icon = ICONS[type] ?? IconInfo

  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey) }
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
          <Icon />
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
