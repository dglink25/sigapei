import { useCallback, useEffect, useState } from 'react'
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { Fingerprint, LogOut, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react'
import { ENV } from '../config/env'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { authService } from '../services/auth.service'
import { unwrap } from '../lib/http'
import { getDeviceId } from '../lib/device'
import { roleOf } from '../components/routes'
import './Home.css'

const DeviceIcon = ({ type }) => (type === 'mobile' ? <Smartphone size={20} /> : type === 'tablette' ? <Tablet size={20} /> : <Monitor size={20} />)

export default function Home() {
  const { user, logout } = useAuth()
  const notify = useNotify()
  const [devices, setDevices] = useState([])
  const [busy, setBusy] = useState(false)

  const loadDevices = useCallback(async () => {
    try {
      const r = unwrap(await authService.devices())
      setDevices(Array.isArray(r) ? r : r?.appareils ?? [])
    } catch (err) {
      notify.fromError(err)
    }
  }, [notify])

  useEffect(() => { loadDevices() }, [loadDevices])

  async function enableFingerprint() {
    if (!browserSupportsWebAuthn()) {
      return notify.error('Biométrie indisponible', "Cet appareil ou ce navigateur ne permet pas l'enregistrement d'une empreinte.")
    }
    setBusy(true)
    try {
      const raw = unwrap(await authService.webauthnOptionsEnregistrement())
      const reponse = await startRegistration({ optionsJSON: raw?.options ?? raw })
      await authService.webauthnVerifierEnregistrement(reponse)
      notify.success('Empreinte enregistrée', 'Vous pouvez désormais vous connecter par matricule sur cet appareil.')
      loadDevices()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function revoke(uuid) {
    try {
      await authService.revokeDevice(uuid)
      notify.success('Appareil révoqué', "L'appareil a été déconnecté et son empreinte supprimée.")
      loadDevices()
    } catch (err) {
      notify.fromError(err)
    }
  }

  const here = getDeviceId()
  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-brand">
          <img src="/sigapei.png" alt={ENV.appName} />
          <div>
            <strong>{nom}</strong>
            <span>{user?.role?.libelle ?? roleOf(user) ?? ''}</span>
          </div>
        </div>
        <button type="button" className="home-logout" onClick={() => logout('manual')}>
          <LogOut size={18} /> Se déconnecter
        </button>
      </header>

      <main className="home-main">
        <section className="home-card">
          <h2>Sécurité du compte</h2>
          <p>Activez la connexion par matricule + empreinte digitale sur cet appareil.</p>
          <button type="button" className="home-btn" onClick={enableFingerprint} disabled={busy}>
            <Fingerprint size={20} /> {busy ? 'Enregistrement…' : 'Activer l’empreinte sur cet appareil'}
          </button>
        </section>

        <section className="home-card">
          <h2>Vos appareils connectés</h2>
          {devices.length === 0 && <p>Aucun appareil à afficher.</p>}
          <ul className="home-devices">
            {devices.map((d) => (
              <li key={d.uuid}>
                <DeviceIcon type={d.type} />
                <div>
                  <strong>{d.nomAppareil ?? d.nom_appareil ?? 'Appareil'}</strong>
                  <small>
                    {d.os}
                    {d.identifiantLocal === here ? ' · cet appareil' : ''}
                    {d.derniereActivite ? ` · ${new Date(d.derniereActivite).toLocaleString('fr-FR')}` : ''}
                  </small>
                </div>
                <button type="button" onClick={() => revoke(d.uuid)} aria-label="Révoquer cet appareil">
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
