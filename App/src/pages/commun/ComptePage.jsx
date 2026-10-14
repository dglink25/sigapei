import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Shield, Monitor, Smartphone, Tablet,
  Fingerprint, Trash2, ArrowLeft, Info
} from 'lucide-react'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { useAuth }    from '../../context/identite/AuthContext'
import { useNotify }  from '../../context/commun/NotifyContext'
import { unwrap }     from '../../lib/commun/http'
import { getDeviceId } from '../../lib/identite/device'
import { profilService } from '../../services/commun/profil.service'
import { redirectionPostLogin, roleCodeOf } from '../../config/identite/routes'
import ThemeToggle    from '../../components/commun/ThemeToggle'
import Loader         from '../../components/commun/Loader'
import './compte.css'

const ONGLETS = [
  { id: 'profil',    label: 'Mon profil',          icon: User },
  { id: 'securite',  label: 'Sécurité',             icon: Shield },
  { id: 'sessions',  label: 'Appareils & sessions', icon: Monitor },
]

function DeviceIcon({ type }) {
  if (type === 'mobile' || type === 'smartphone') return <Smartphone size={18} />
  if (type === 'tablette' || type === 'tablet')   return <Tablet size={18} />
  return <Monitor size={18} />
}

/* ════════════════════════════════════════
   Onglet Profil
════════════════════════════════════════ */
function OngletProfil({ user }) {
  const roleCode = roleCodeOf(user)
  const nom      = user?.nomComplet ?? user?.nom_complet ?? '—'
  const initiales = nom.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  const champs = [
    ['Nom complet', nom],
    ['Rôle', roleCode.replace(/_/g, ' ')],
    ['E-mail', user?.email ?? '—'],
    ['Téléphone', user?.telephone ?? '—'],
    ['Tenant / Établissement', user?.tenantId ?? '—'],
    ['Identifiant', user?.uuid ?? '—'],
  ]

  return (
    <>
      <div className="cp-profil-hero">
        <span className="cp-avatar-lg" aria-hidden="true">{initiales}</span>
        <div>
          <p className="cp-profil-nom">{nom}</p>
          {roleCode && <span className="cp-profil-role">{roleCode.replace(/_/g, ' ')}</span>}
        </div>
      </div>

      <div className="cp-card">
        <p className="cp-card-title"><User size={16} /> Informations du compte</p>
        <p className="cp-card-sub">Ces informations sont gérées par l'administrateur de la plateforme.</p>
        <dl className="cp-rows">
          {champs.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>
          ))}
        </dl>
      </div>
    </>
  )
}

/* ════════════════════════════════════════
   Onglet Sécurité
════════════════════════════════════════ */
function OngletSecurite() {
  const notify = useNotify()
  const [busy, setBusy] = useState(false)

  async function activerEmpreinte() {
    if (!browserSupportsWebAuthn()) {
      return notify.error('Biométrie indisponible', "Cet appareil ou ce navigateur ne prend pas en charge l'enregistrement d'une empreinte.")
    }
    setBusy(true)
    try {
      const raw = unwrap(await profilService.optionsEnregistrement())
      const reponse = await startRegistration({ optionsJSON: raw?.options ?? raw })
      await profilService.verifierEnregistrement(reponse)
      notify.success('Empreinte enregistrée', 'Vous pouvez désormais vous connecter par matricule + empreinte sur cet appareil.')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cp-card">
      <p className="cp-card-title"><Fingerprint size={16} /> Connexion biométrique</p>
      <p className="cp-card-sub">
        Activez la connexion par empreinte digitale sur cet appareil pour vous authentifier
        par matricule sans saisir de code OTP.
      </p>
      <button type="button" className="cp-btn" onClick={activerEmpreinte} disabled={busy}>
        {busy ? <><Loader mode="button" /> Enregistrement…</> : <><Fingerprint size={16} /> Activer sur cet appareil</>}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   Onglet Appareils & Sessions
════════════════════════════════════════ */
function OngletSessions() {
  const notify   = useNotify()
  const { logout } = useAuth()
  const [appareils, setAppareils] = useState(null)
  const ici = getDeviceId()

  const charger = useCallback(async () => {
    try {
      const r = unwrap(await profilService.listerAppareils())
      setAppareils(Array.isArray(r) ? r : r?.appareils ?? [])
    } catch (err) {
      notify.fromError(err)
      setAppareils([])
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  async function revoquer(uuid, estActuel) {
    try {
      await profilService.revoquerAppareil(uuid)
      notify.success('Session révoquée', "L'appareil a été déconnecté.")
      if (estActuel) logout('manual')
      else charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  if (appareils === null) return <div className="cp-loading"><Loader mode="inline" size="sm" label="Chargement des sessions…" /></div>

  return (
    <div className="cp-card">
      <p className="cp-card-title"><Monitor size={16} /> Appareils connectés</p>
      <p className="cp-card-sub">
        {appareils.length} appareil{appareils.length > 1 ? 's' : ''} actif{appareils.length > 1 ? 's' : ''}.
        Révoquez les appareils que vous ne reconnaissez pas.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {appareils.length === 0 && (
          <p style={{ color: 'var(--cp-muted)', fontSize: '0.88rem' }}>Aucun appareil enregistré.</p>
        )}
        {appareils.map(d => {
          const estActuel = d.identifiantLocal === ici
          return (
            <div key={d.uuid} className={`cp-device${estActuel ? ' is-current' : ''}`}>
              <div className="cp-device-ico">
                <DeviceIcon type={d.type} />
              </div>
              <div className="cp-device-info">
                <p className="cp-device-name">
                  {d.nomAppareil ?? d.nom_appareil ?? 'Appareil'}
                  {estActuel && <span className="cp-device-badge" style={{ marginLeft: 8 }}>Cet appareil</span>}
                </p>
                <p className="cp-device-meta">
                  {[d.os, d.derniereActivite && `Dernière activité : ${new Date(d.derniereActivite).toLocaleString('fr-FR')}`]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                className="cp-btn cp-btn--danger cp-btn--sm cp-btn--icon"
                onClick={() => revoquer(d.uuid, estActuel)}
                aria-label={estActuel ? 'Se déconnecter de cet appareil' : 'Révoquer cet appareil'}
                title={estActuel ? 'Se déconnecter' : 'Révoquer'}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="cp-alert" style={{ marginTop: 16 }}>
        <Info size={15} />
        <p>Révoquer cet appareil vous déconnectera immédiatement de cette session.</p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Page principale — ComptePage
════════════════════════════════════════ */
export default function ComptePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState('profil')

  // Lien retour vers l'espace du rôle
  const retour = redirectionPostLogin(roleCodeOf(user))

  return (
    <div className="cp">
      {/* ── Topbar ── */}
      <header className="cp-topbar">
        <button
          type="button"
          className="cp-topbar-back"
          onClick={() => navigate(retour)}
          aria-label="Retour"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 className="cp-topbar-title">Mon compte</h1>
        <div className="cp-topbar-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Onglets ── */}
      <nav className="cp-nav" aria-label="Sections du compte">
        {ONGLETS.map(o => {
          const Icon = o.icon
          return (
            <button
              key={o.id}
              type="button"
              className={`cp-nav-tab${onglet === o.id ? ' is-active' : ''}`}
              onClick={() => setOnglet(o.id)}
              aria-current={onglet === o.id ? 'page' : undefined}
            >
              <Icon size={15} aria-hidden="true" />
              {o.label}
            </button>
          )
        })}
      </nav>

      {/* ── Contenu ── */}
      <div className="cp-body">
        {onglet === 'profil'   && <OngletProfil user={user} />}
        {onglet === 'securite' && <OngletSecurite />}
        {onglet === 'sessions' && <OngletSessions />}
      </div>
    </div>
  )
}
