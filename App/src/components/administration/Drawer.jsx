import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './admin-ui.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Tiroir latéral (panneau montant sur mobile) : role="dialog", focus piégé, Échap pour fermer,
 * défilement du fond verrouillé, animation d'entrée ET de sortie.
 */
export default function Drawer({ open, title, subtitle, onClose, busy = false, footer, children }) {
  const [rendu, setRendu] = useState(open)
  const [sortie, setSortie] = useState(false)
  const panelRef = useRef(null)
  const retour = useRef(null)
  const titreId = useId()

  /* Montage / démontage différé pour laisser jouer l'animation de sortie */
  useEffect(() => {
    if (open) {
      setRendu(true)
      setSortie(false)
      return undefined
    }
    if (!rendu) return undefined
    setSortie(true)
    const t = setTimeout(() => {
      setRendu(false)
      setSortie(false)
    }, 220)
    return () => clearTimeout(t)
  }, [open, rendu])

  /* Verrou de défilement, focus initial et restitution du focus */
  useEffect(() => {
    if (!open) return undefined
    retour.current = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el =
        panelRef.current?.querySelector('[data-autofocus]') ??
        panelRef.current?.querySelector('input:not([type="checkbox"]), textarea, select')
      ;(el ?? panelRef.current)?.focus()
    }, 80)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = overflow
      retour.current?.focus?.()
    }
  }, [open])

  /* Clavier : Échap + piège de focus */
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const els = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])]
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!rendu) return null

  return createPortal(
    <div
      className={`ap-drawer-overlay${sortie ? ' is-out' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <aside
        ref={panelRef}
        className={`ap-drawer${sortie ? ' is-out' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        tabIndex={-1}
      >
        <header className="ap-drawer-head">
          <div>
            <h2 id={titreId} className="ap-drawer-title">{title}</h2>
            {subtitle && <p className="ap-drawer-sub">{subtitle}</p>}
          </div>
          <button type="button" className="ap-drawer-close" onClick={onClose} disabled={busy} aria-label="Fermer">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="ap-drawer-body">{children}</div>
        {footer && <footer className="ap-drawer-foot">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
