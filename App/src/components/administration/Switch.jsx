import './admin-ui.css'

/** Interrupteur accessible (role="switch") ; `busy` fige l'action pendant l'appel API. */
export default function Switch({ checked, onChange, label, id, disabled = false, busy = false }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || busy}
      className={`ap-switch${checked ? ' is-on' : ''}${busy ? ' is-busy' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ap-switch-thumb" />
    </button>
  )
}
