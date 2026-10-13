import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './NoticeModal.css'

/* ────────────────────────────────────────────────────────
   Icônes SVG animées — cercle qui se trace + symbole
   r=20 → circonférence = 2π×20 ≈ 125.66
──────────────────────────────────────────────────────── */

function IconSuccess() {
  return (
    <svg className="nsvg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Cercle tracé */}
      <circle
        className="nsvg-ring nsvg-ring--success"
        cx="24" cy="24" r="20"
        strokeLinecap="round"
      />
      {/* Coche */}
      <polyline
        className="nsvg-path nsvg-path--check"
        points="13,25 21,33 35,17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconError() {
  return (
    <svg className="nsvg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle
        className="nsvg-ring nsvg-ring--error"
        cx="24" cy="24" r="20"
        strokeLinecap="round"
      />
      <line className="nsvg-path nsvg-path--x1" x1="16" y1="16" x2="32" y2="32" strokeLinecap="round" />
      <line className="nsvg-path nsvg-path--x2" x1="32" y1="16" x2="16" y2="32" strokeLinecap="round" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg className="nsvg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle
        className="nsvg-ring nsvg-ring--warning"
        cx="24" cy="24" r="20"
        strokeLinecap="round"
      />
      <line className="nsvg-path nsvg-path--stem" x1="24" y1="15" x2="24" y2="27" strokeLinecap="round" />
      <circle className="nsvg-dot nsvg-dot--warning" cx="24" cy="33" r="2" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg className="nsvg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle
        className="nsvg-ring nsvg-ring--info"
        cx="24" cy="24" r="20"
        strokeLinecap="round"
      />
      <circle className="nsvg-dot nsvg-dot--info-top" cx="24" cy="16" r="2" />
      <line className="nsvg-path nsvg-path--stem" x1="24" y1="22" x2="24" y2="33" strokeLinecap="round" />
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
          <X size={17} />
        </button>

        <div className="notice-icon-wrap">
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
