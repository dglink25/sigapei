import { useToastsStore } from '../stores/toasts.js'

const ICONES = { succes: '✓', erreur: '✕', info: 'ℹ' }

export function Toasts() {
  const toasts = useToastsStore((etat) => etat.toasts)
  const retirerToast = useToastsStore((etat) => etat.retirerToast)

  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icone" aria-hidden="true">
            {ICONES[toast.type] ?? 'ℹ'}
          </span>
          <p className="toast-message">{toast.message}</p>
          <button
            type="button"
            className="toast-fermer"
            onClick={() => retirerToast(toast.id)}
            aria-label="Fermer le message"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
