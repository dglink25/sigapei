import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open, title, message, children, confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  tone = 'primary', loading = false, icon: Icon = TriangleAlert, onConfirm, onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && !loading && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null
  return createPortal(
    <div className="cd-overlay" onClick={() => !loading && onCancel()}>
      <div className={`cd cd--${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="cd-title" onClick={(e) => e.stopPropagation()}>
        <div className="cd-icon"><Icon size={30} aria-hidden="true" /></div>
        <h2 id="cd-title" className="cd-title">{title}</h2>
        {message && <p className="cd-msg">{message}</p>}
        {children}
        <div className="cd-actions">
          <button type="button" className="cd-btn" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button type="button" className="cd-btn cd-btn--main" onClick={onConfirm} disabled={loading}>
            {loading ? 'Veuillez patienter…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
