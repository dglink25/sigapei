import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmDialog.css'

/* ── Icônes SVG animées selon le tone ── */
function IconDanger() {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="cd-ring" cx="48" cy="48" r="38" />
      <line className="cd-sym"  x1="32" y1="32" x2="64" y2="64" strokeLinecap="round" />
      <line className="cd-sym2" x1="64" y1="32" x2="32" y2="64" strokeLinecap="round" style={{ strokeDasharray: 45, strokeDashoffset: 45, animationDelay: '0.73s' }} />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="cd-ring" cx="48" cy="48" r="38" />
      <line   className="cd-sym2" x1="48" y1="28" x2="48" y2="54" strokeLinecap="round" style={{ strokeDasharray: 26, strokeDashoffset: 26 }} />
      <circle className="cd-dot"  cx="48" cy="64" r="4" />
    </svg>
  )
}

function IconPrimary() {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle className="cd-ring" cx="48" cy="48" r="38" />
      <polyline className="cd-sym" points="28,50 42,64 68,32" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TONE_ICONS = { danger: IconDanger, warning: IconWarning, primary: IconPrimary }

export default function ConfirmDialog({
  open, title, message, children,
  confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  tone = 'primary', loading = false,
  onConfirm, onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && !loading && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const Icon = TONE_ICONS[tone] ?? IconPrimary

  return createPortal(
    <div className="cd-overlay" onClick={() => !loading && onCancel()}>
      <div
        className={`cd cd--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cd-icon"><Icon /></div>
        <h2 id="cd-title" className="cd-title">{title}</h2>
        {message && <p className="cd-msg">{message}</p>}
        {children}
        <div className="cd-actions">
          <button type="button" className="cd-btn" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="cd-btn cd-btn--main" onClick={onConfirm} disabled={loading}>
            {loading ? 'Veuillez patienter…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
