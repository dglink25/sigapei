import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { getExampleNumber, getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { Phone, Mail, Fingerprint, ArrowLeft } from 'lucide-react'
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { ENV } from '../../config/env'
import { useNotify } from '../../context/NotifyContext'
import { unwrap } from '../../lib/http'
import { useAuth } from './AuthContext'
import { authService } from './services/auth.service'
import { getCaptchaToken } from './lib/captcha'
import { getGoogleIdToken } from './lib/firebase'
import { HOME_PATH, LOGIN_PATH } from './config'
import './AuthPage.css'

const METHODS = [
  { id: 'phone', label: 'Téléphone', Icon: Phone },
  { id: 'email', label: 'E-mail', Icon: Mail },
  { id: 'matricule', label: 'Matricule', Icon: Fingerprint },
]

const MATRICULE_REGEX = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/* Masque XXX-XXXX-XXXXXXX applique a la frappe */
function formatMatricule(value) {
  const c = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  return [c.slice(0, 3), c.slice(3, 7), c.slice(7, 14)].filter(Boolean).join('-')
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

export default function AuthPage() {
  const { login } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()
  const location = useLocation()

  // L'URL /login#recuperer ouvre directement le parcours de recuperation
  const mode = location.hash === '#recuperer' ? 'recover' : 'login'
  const from = location.state?.from
  const redirectTo = from ? from.pathname + (from.search ?? '') + (from.hash ?? '') : HOME_PATH

  const [step, setStep] = useState('identifier') // identifier | confirm | otp | done
  const [method, setMethod] = useState('phone')

  const [phone, setPhone] = useState()
  const [country, setCountry] = useState('BJ')
  const [email, setEmail] = useState('')
  const [matricule, setMatricule] = useState('')
  const [otp, setOtp] = useState('')

  const [nom, setNom] = useState('')
  const [account, setAccount] = useState(null)
  const [revealed, setRevealed] = useState('')

  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    setStep('identifier')
    setOtp('')
    setAccount(null)
    setRevealed('')
  }, [mode])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const example = useMemo(() => {
    try { return getExampleNumber(country, examples)?.formatNational() ?? '' } catch { return '' }
  }, [country])

  const dialCode = useMemo(() => {
    try { return getCountryCallingCode(country) } catch { return '' }
  }, [country])

  const identifiant = method === 'phone' ? phone : method === 'email' ? email.trim().toLowerCase() : matricule

  function switchMode(next) {
    navigate({ pathname: LOGIN_PATH, hash: next === 'recover' ? '#recuperer' : '' }, { state: location.state })
  }

  function back() {
    setOtp('')
    setStep(mode === 'recover' && step === 'otp' ? 'confirm' : 'identifier')
  }

  async function run(task) {
    setLoading(true)
    try {
      await task()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setLoading(false)
    }
  }

  async function finishLogin(session) {
    const u = await login(session)
    const nomComplet = u?.nomComplet ?? u?.nom_complet ?? ''
    notify.success('Connexion réussie', nomComplet ? `Bienvenue, ${nomComplet}.` : `Bienvenue sur ${ENV.appName}.`)
    navigate(redirectTo, { replace: true })
  }

  function validateLogin() {
    if (method === 'phone' && !(phone && isValidPhoneNumber(phone)))
      return `Numéro invalide.${example ? ` Exemple : ${example}` : ''}`
    if (method === 'email' && !EMAIL_REGEX.test(email.trim())) return 'Adresse e-mail invalide.'
    if (method === 'matricule' && !MATRICULE_REGEX.test(matricule)) return 'Format attendu : XXX-XXXX-XXXXXXX.'
    return ''
  }

  /* ---------------- Connexion ---------------- */
  function submitLogin(e) {
    e.preventDefault()
    const invalid = validateLogin()
    if (invalid) return notify.warning('Saisie incomplète', invalid)

    return run(async () => {
      await authService.identifier(identifiant) // verifie que le compte existe

      if (method === 'matricule') {
        if (!browserSupportsWebAuthn()) {
          return notify.error('Biométrie indisponible', "Cet appareil ou ce navigateur ne permet pas la connexion par empreinte.")
        }
        const raw = unwrap(await authService.webauthnOptionsConnexion(matricule))
        const reponse = await startAuthentication({ optionsJSON: raw?.options ?? raw })
        return finishLogin(await authService.webauthnVerifierConnexion(matricule, reponse))
      }

      const captcha = await getCaptchaToken('connexion')
      await authService.envoyerOtp(identifiant, captcha)
      notify.success('Code envoyé', method === 'email' ? `Un code a été envoyé à ${identifiant}.` : 'Un code a été envoyé par SMS et WhatsApp.')
      setStep('otp')
      return setCooldown(30)
    })
  }

  function googleLogin() {
    return run(async () => {
      const idToken = await getGoogleIdToken()
      await finishLogin(await authService.firebase(idToken))
    })
  }

  /* ---------------- Recuperation ---------------- */
  function submitSearch(e) {
    e.preventDefault()
    if (nom.trim().length < 3)
      return notify.warning('Saisie incomplète', 'Saisissez votre nom complet ou votre identifiant de récupération.')
    return run(async () => {
      const captchaToken = await getCaptchaToken('recuperation')
      const r = unwrap(await authService.rechercherCompte({ indice: nom.trim(), captchaToken }))
      setAccount({
        uuid: r?.uuid ?? r?.compteUuid ?? r?.id,
        masque: r?.identifiantMasque ?? r?.identifiant_masque ?? r?.masque ?? '',
      })
      setStep('confirm')
    })
  }

  function sendRecoveryOtp() {
    return run(async () => {
      await authService.envoyerOtpRecuperation(account.uuid)
      notify.success('Code envoyé', 'Un code a été envoyé sur votre identifiant de récupération.')
      setStep('otp')
      setCooldown(30)
    })
  }

  /* ---------------- OTP ---------------- */
  function submitOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return notify.warning('Code incomplet', 'Saisissez le code à 6 chiffres.')
    return run(async () => {
      if (mode === 'recover') {
        const r = unwrap(await authService.confirmerRecuperation(account.uuid, otp))
        setRevealed(r?.identifiant ?? r?.identifiantConnexion ?? '')
        notify.success('Compte retrouvé', 'Votre identifiant de connexion est affiché.')
        setStep('done')
      } else {
        await finishLogin(await authService.verifierOtp(identifiant, otp))
      }
    })
  }

  function resend() {
    if (cooldown > 0) return undefined
    return run(async () => {
      if (mode === 'recover') await authService.envoyerOtpRecuperation(account.uuid)
      else await authService.envoyerOtp(identifiant, await getCaptchaToken('connexion'))
      notify.success('Code renvoyé', 'Un nouveau code vient de vous être envoyé.')
      setCooldown(60)
    })
  }

  const otpHint =
    mode === 'recover'
      ? `Un code a été envoyé sur ${account?.masque || 'votre identifiant de récupération'}.`
      : method === 'email'
        ? `Un code a été envoyé à ${email.trim()}.`
        : 'Un code a été envoyé par SMS et WhatsApp.'

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        {step !== 'identifier' && step !== 'done' && (
          <button type="button" className="auth-back" onClick={back} aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
        )}

        <img className="auth-logo" src="/sigapei.png" alt={ENV.appName} />
        <h1 className="auth-title">{mode === 'login' ? 'Bon retour' : 'Récupérer mon compte'}</h1>

        {/* ===== Connexion ===== */}
        {mode === 'login' && step === 'identifier' && (
          <form onSubmit={submitLogin} noValidate>
            <div className="method-group" role="radiogroup" aria-label="Mode de connexion">
              {METHODS.map(({ id, label, Icon }) => (
                <label key={id} className={`method ${method === id ? 'is-active' : ''}`}>
                  <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} />
                  <Icon size={20} aria-hidden="true" />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {method === 'phone' && (
              <>
                <label className="auth-label" htmlFor="phone">Numéro de téléphone</label>
                <div className="field field-phone">
                  <PhoneInput
                    id="phone"
                    defaultCountry="BJ"
                    placeholder={example}
                    value={phone}
                    onChange={setPhone}
                    onCountryChange={(c) => c && setCountry(c)}
                    limitMaxLength
                  />
                </div>
                <p className="auth-hint">
                  Indicatif +{dialCode}
                  {example && <> · exemple : {example}</>}
                </p>
              </>
            )}

            {method === 'email' && (
              <>
                <label className="auth-label" htmlFor="email">Adresse e-mail</label>
                <input
                  id="email" className="field" type="email" inputMode="email" autoComplete="email"
                  placeholder="exemple@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </>
            )}

            {method === 'matricule' && (
              <>
                <label className="auth-label" htmlFor="matricule">Matricule</label>
                <input
                  id="matricule" className="field" type="text" autoComplete="username" autoCapitalize="characters"
                  placeholder="XXX-XXXX-XXXXXXX" value={matricule}
                  onChange={(e) => setMatricule(formatMatricule(e.target.value))}
                />
                <p className="auth-hint">La connexion se confirme avec l'empreinte digitale de cet appareil.</p>
              </>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Veuillez patienter…' : 'Se connecter'}
            </button>

            <div className="auth-sep"><span>ou</span></div>

            <button type="button" className="auth-btn google" onClick={googleLogin} disabled={loading}>
              <GoogleIcon /> Continuer avec Google
            </button>
          </form>
        )}

        {/* ===== Recuperation : recherche ===== */}
        {mode === 'recover' && step === 'identifier' && (
          <form onSubmit={submitSearch} noValidate>
            <label className="auth-label" htmlFor="nom">Nom complet ou identifiant de récupération</label>
            <input id="nom" className="field" type="text" autoComplete="name" placeholder="Ex. : Mon Nom complet"
              value={nom} onChange={(e) => setNom(e.target.value)} />

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Recherche…' : 'Rechercher mon compte'}
            </button>
          </form>
        )}

        {/* ===== Recuperation : confirmation du compte ===== */}
        {mode === 'recover' && step === 'confirm' && (
          <div>
            <p className="auth-text">Un compte correspond à votre recherche :</p>
            <p className="auth-masked">{account?.masque || 'Compte trouvé'}</p>
            <button className="auth-btn" onClick={sendRecoveryOtp} disabled={loading}>
              {loading ? 'Envoi…' : 'Recevoir un code'}
            </button>
          </div>
        )}

        {/* ===== OTP ===== */}
        {step === 'otp' && (
          <form onSubmit={submitOtp} noValidate>
            <p className="auth-text">{otpHint}</p>
            <label className="auth-label" htmlFor="otp">Code de vérification</label>
            <input id="otp" className="field otp" type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} placeholder="••••••" value={otp} autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Vérification…' : 'Valider'}
            </button>
            <button type="button" className="auth-link center" onClick={resend} disabled={cooldown > 0 || loading}>
              {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : 'Renvoyer le code'}
            </button>
          </form>
        )}

        {/* ===== Recuperation : resultat ===== */}
        {step === 'done' && (
          <div>
            <p className="auth-text">Votre identifiant de connexion est :</p>
            <p className="auth-masked">{revealed}</p>
            <button className="auth-btn" onClick={() => switchMode('login')}>Retour à la connexion</button>
          </div>
        )}

        {step === 'identifier' && (
          <p className="auth-footer">
            {mode === 'login' ? (
              <>
                Identifiant oublié ?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('recover')}>Récupérer mon compte</button>
              </>
            ) : (
              <>
                Vous avez retrouvé votre identifiant ?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>Se connecter</button>
              </>
            )}
          </p>
        )}
      </section>
    </main>
  )
}
