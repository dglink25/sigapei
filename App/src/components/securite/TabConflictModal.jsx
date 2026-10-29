import { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, XCircle } from 'lucide-react'
import { tabGuard } from '../../services/securite/tabGuard.service'
import { ENV } from '../../config/commun/env'

export default function TabConflictModal() {
  const [state, setState] = useState({ isSuspended: false })

  useEffect(() => {
    const unsub = tabGuard.subscribe(setState)
    return unsub
  }, [])

  if (!state.isSuspended) return null

  const handleClose = () => {
    try {
      window.close()
    } catch { /* ignore */ }
  }

  const handleReprendre = () => {
    tabGuard.reprendreControle()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tab-conflict-title"
      className="sg-modal-page"
    >
      <section className="sg-modal-card" role="alert">
        <img className="sg-modal-logo" src="/sigapei.png" alt={ENV.appName} />

        <div className="sg-modal-badge">
          <ShieldAlert size={16} />
          <span>SESSION ACTIVE MULTI-ONGLETS</span>
        </div>

        <h1 id="tab-conflict-title" className="sg-modal-title">
          Session Déplacée vers un Autre Onglet
        </h1>

        <p className="sg-modal-msg">
          L&apos;application {ENV.appName} a été ouverte dans un nouvel onglet de ce navigateur.
          Afin de prévenir tout conflit de transactions administratives et garantir la cohérence
          absolue de vos données, cet ancien onglet a été temporairement suspendu.
        </p>

        <div className="sg-modal-status-chip">
          <span className="sg-modal-status-dot" />
          <span>Statut : Onglet mis en veille de sécurité</span>
        </div>

        <div className="sg-modal-actions">
          <button
            type="button"
            onClick={handleReprendre}
            className="sg-modal-btn is-primary"
          >
            <RefreshCw size={17} style={{ marginRight: '8px' }} />
            Reprendre le contrôle ici
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="sg-modal-btn"
          >
            <XCircle size={17} style={{ marginRight: '8px' }} />
            Fermer cet onglet
          </button>
        </div>

        <p className="sg-modal-foot">
          {ENV.appName} · Plateforme intégrée de gestion scolaire
        </p>
      </section>
    </div>
  )
}
