import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { ArrowLeft, Fingerprint, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { unwrap } from '../../lib/commun/http'
import { authService } from '../../services/identite/auth.service'
import { getDeviceId } from '../../lib/identite/device'
import { HOME_PATH } from '../../config/identite/routes'
import './SecuritePage.css'

const DeviceIcon = ({ type }) =>
  type === 'mobile' ? <Smartphone size={20} /> : type === 'tablette' ? <Tablet size={20} /> : <Monitor size={20} />

/** Securite du compte : empreinte de l'appareil + appareils connectes (page protegee par <RequireAuth />). */
export default function SecuritePage() {
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

  return (
    <div className="sec">
      <header className="sec-header">
        <Link to={HOME_PATH} className="sec-back"><ArrowLeft size={18} /> Retour</Link>
        <h1>Sécurité du compte</h1>
      </header>

      <main className="sec-main">
        <section className="sec-card">
          <h2>Connexion par empreinte</h2>
          <p>Activez la connexion par matricule + empreinte digitale sur cet appareil.</p>
          <button type="button" className="sec-btn" onClick={enableFingerprint} disabled={busy}>
            <Fingerprint size={20} /> {busy ? 'Enregistrement…' : 'Activer l’empreinte sur cet appareil'}
          </button>
        </section>

        <section className="sec-card">
          <h2>Vos appareils connectés</h2>
          {devices.length === 0 && <p>Aucun appareil à afficher.</p>}
          <ul className="sec-devices">
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
