import { Building2, Check, FileText, MapPin, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import { STATUTS } from '../../config/etablissements/config'

const STEP_ICONS = { 1: Building2, 2: MapPin, 3: UserRound, 4: FileText, 5: ShieldCheck }

/** Champ de formulaire : libelle, aide, erreur et mise en evidence « a corriger » (avec motif). */
export function Field({ id, label, required, hint, error, flagged, motif, children, className = '' }) {
  return (
    <div className={`dm-field ${error ? 'has-error' : ''} ${flagged ? 'is-flagged' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="dm-label">
          {label}
          {required && <span className="dm-req" aria-hidden="true"> *</span>}
        </label>
      )}
      {flagged && (
        <p className="dm-motif">
          <TriangleAlert size={16} aria-hidden="true" />
          <span><strong>À corriger</strong>{motif ? ` : ${motif}` : ''}</span>
        </p>
      )}
      {children}
      {hint && !error && <p className="dm-hint">{hint}</p>}
      {error && <p className="dm-error" role="alert">{error}</p>}
    </div>
  )
}

export function Stepper({ steps, current, onGo }) {
  return (
    <ol className="dm-stepper" aria-label="Progression">
      {steps.map((s) => {
        const done = s.id < current
        const active = s.id === current
        const Icon = STEP_ICONS[s.id]
        return (
          <li key={s.id} className={`dm-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
            <button type="button" disabled={!done} onClick={() => onGo(s.id)} aria-current={active ? 'step' : undefined}>
              <span className="dm-step-dot">{done ? <Check size={16} /> : <Icon size={16} />}</span>
              <span className="dm-step-label">{s.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function StatusBadge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut || '—', tone: 'neutral' }
  return <span className={`ad-badge ad-badge--${s.tone}`}>{s.label}</span>
}
