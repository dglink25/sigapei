import { ENV } from '../../config/env'

/** Ecran affiche pendant la restauration de la session. */
export default function Splash() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#fff6dd' }}>
      <div style={{ textAlign: 'center', color: '#006b3c', fontFamily: 'system-ui, sans-serif' }}>
        <img src="/sigapei.png" alt={ENV.appName} style={{ height: 64, marginBottom: 16 }} />
        <div style={{ fontWeight: 600 }}>Chargement de votre session…</div>
      </div>
    </div>
  )
}
