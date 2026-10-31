import { useEffect, useState } from 'react'
import { Clock, ShieldAlert } from 'lucide-react'
import { rateLimitGuard } from '../../services/securite/rateLimitGuard.service'
import { ENV } from '../../config/commun/env'

export default function RateLimitModal() {
  const [state, setState] = useState(() => ({
    locked: rateLimitGuard.isLocked(),
    remaining: rateLimitGuard.getRemainingSeconds(),
    total: rateLimitGuard.getTotalDuration(),
  }))

  useEffect(() => {
    const unsub = rateLimitGuard.subscribe((s) => setState(s))
    return unsub
  }, [])

  if (!state.locked) return null

  const progressPercent = state.total > 0
    ? Math.max(0, Math.min(100, Math.round(((state.total - state.remaining) / state.total) * 100)))
    : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-limit-title"
      className="sg-modal-page"
    >
      <section className="sg-modal-card" role="alert">
        <img className="sg-modal-logo" src="/sigapei.png" alt={ENV.appName} />

        <p className="sg-modal-code">429</p>

        <h1 id="rate-limit-title" className="sg-modal-title">
          Trop de requêtes détectées
        </h1>

        <p className="sg-modal-msg">
          Afin de protéger la plateforme contre les attaques et les surcharges excessives,
          l&apos;émission de requêtes depuis ce navigateur est momentanément suspendue.
        </p>

        <div className="sg-modal-timer-box">
          <div className="sg-modal-timer-row">
            <Clock size={20} className="sg-modal-timer-icon" />
            <span className="sg-modal-timer-val">{state.remaining}</span>
            <span className="sg-modal-timer-unit">seconde{state.remaining > 1 ? 's' : ''} restante{state.remaining > 1 ? 's' : ''}</span>
          </div>

          <div className="sg-modal-progress-bg" aria-hidden="true">
            <div
              className="sg-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="sg-modal-timer-sub">
            Vérification de sécurité active. Vos accès se débloqueront automatiquement dès la fin du compte à rebours sans actualiser la page.
          </p>
        </div>

        <div className="sg-modal-status-chip">
          <ShieldAlert size={15} />
          <span>Protection anti-attaque active</span>
        </div>

        <p className="sg-modal-foot">
          {ENV.appName} · Plateforme intégrée de gestion scolaire
        </p>
      </section>
    </div>
  )
}
