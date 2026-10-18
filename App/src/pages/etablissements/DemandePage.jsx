import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleCheck, House, RotateCcw, Send } from 'lucide-react'
import { ENV } from '../../config/commun/env'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import { ApiError } from '../../lib/commun/http'
import { LOGIN_PATH, HOME_PATH } from '../../config/identite/routes'
import { getCaptchaToken } from '../../lib/identite/captcha'
import { DOC_TYPES, STEPS, STEP_CHAMPS } from '../../config/etablissements/config'
import { EMPTY_FORM, champOf, draftPayload, validateChamps } from '../../lib/etablissements/form'
import { clearDraft, loadDraft, saveDraft } from '../../lib/etablissements/draft'
import { captureGeolocation } from '../../lib/etablissements/geoloc'
import { demandeService } from '../../services/etablissements/etablissement.service'
import { Stepper } from '../../components/etablissements/ui'
import { StepConfirmation, StepDirigeant, StepDocuments, StepEtablissement, StepLocalisation } from '../../components/etablissements/FormSteps'
import Loader from '../../components/commun/Loader'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './etablissements.css'

const TITLES = {
  1: ["Informations sur l'établissement", 'Présentez votre établissement.'],
  2: ['Localisation', 'Où se situe votre établissement ?'],
  3: ['Dirigeant', 'Qui dirige l’établissement ?'],
  4: ['Documents', "Joignez les pièces justificatives (toutes obligatoires : autorisation, pièce d'identité et logo)."],
  5: ['Confirmation', 'Vérifiez vos informations avant de soumettre.'],
}

/** Section de la demande enregistree (brouillon) a la fin de chaque etape. */
const STEP_SECTIONS = { 1: ['etablissement'], 2: ['localisation'], 3: ['dirigeant'], 4: [], 5: [] }

/** Documents exiges avant la soumission (le serveur refuse aussi la soumission sans logo : 422 `documents.logo`). */
const CHAMPS_DOCUMENTS = STEP_CHAMPS[4]

const isEmptyDraft = (form, uuid) => !uuid && JSON.stringify(form) === JSON.stringify(EMPTY_FORM)

export default function DemandePage() {
  const notify = useNotify()
  const [step, setStep] = useState(1)
  usePageTitle("Inscrire mon établissement")

  // Afficher le badge reCAPTCHA uniquement sur ce formulaire public
  useEffect(() => {
    document.body.classList.add('page-public-recaptcha')
    return () => document.body.classList.remove('page-public-recaptcha')
  }, [])
  const [form, setForm] = useState(EMPTY_FORM)
  const [docs, setDocs] = useState({})
  const [uuid, setUuid] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [done, setDone] = useState(null)
  const [askReset, setAskReset] = useState(false)
  const geoRef = useRef(null)
  const restored = useRef(false)

  /* ---- Reprise du brouillon (uuid + copie locale du formulaire) ---- */
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const d = loadDraft()
    if (!d?.form) return
    setForm({ ...EMPTY_FORM, ...d.form })
    setDocs(Object.fromEntries(Object.entries(d.docs ?? {}).filter(([, v]) => v?.status === 'done')))
    setUuid(d.uuid ?? null)
    setStep(Math.min(Math.max(d.step ?? 1, 1), 5))
    setSavedAt(d.savedAt ?? null)
    notify.info('Brouillon restauré', 'Vous reprenez votre demande là où vous l’aviez laissée.')
  }, [notify])

  useEffect(() => {
    if (!restored.current || done || isEmptyDraft(form, uuid)) return undefined
    const t = setTimeout(() => saveDraft({ uuid, step, form, docs }), 300)
    return () => clearTimeout(t)
  }, [uuid, step, form, docs, done])

  /* ---- Etape 5 : capture silencieuse de la position (best-effort, jamais bloquante) ---- */
  useEffect(() => {
    if (step !== 5) return
    captureGeolocation().then((g) => { geoRef.current = g })
  }, [step])

  const set = useCallback((patch) => {
    setForm((p) => ({ ...p, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[champOf(k)])
      return next
    })
  }, [])

  const onDoc = useCallback((type, v) => {
    setDocs((p) => ({ ...p, [type]: v }))
    setErrors((e) => {
      const next = { ...e }
      delete next[DOC_TYPES[type].champ]
      return next
    })
  }, [])

  const scrollToError = () => setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)

  /** Revient a l'etape 4 en signalant les documents manquants (brouillon restaure, ou refus du serveur). */
  function retourDocuments(errs) {
    setErrors(errs)
    setStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    scrollToError()
  }

  /** POST /demandes : cree le brouillon (sans uuid) ou le fusionne (avec uuid). */
  async function enregistrer(sections, geo) {
    const payload = draftPayload(form, { uuid, sections, geo })

    // console.log('UUID envoyé :', uuid)
    //console.log('Payload envoyé :', payload)

    const res = await demandeService.enregistrerBrouillon(payload)

    // console.log('Réponse réelle du backend :', res)
    // console.log('UUID retourné :', res?.demandeUuid)
    // console.log('UUID existant :', uuid)

    const id = res?.demandeUuid ?? res?.uuid ?? uuid

    if (!id) {
      throw new ApiError({
        kind: 'session',
        title: 'Enregistrement impossible',
        message: "Le serveur n'a pas renvoyé d'identifiant de brouillon."
      })
    }

    setUuid(id)
    setSavedAt(Date.now())

    return id
  } 
  async function next() {
    const errs = validateChamps(STEP_CHAMPS[step], form, docs)
    if (Object.keys(errs).length) {
      setErrors(errs)
      notify.warning('Formulaire incomplet', 'Veuillez corriger les champs signalés avant de continuer.')
      return scrollToError()
    }

    // Soumission : un brouillon restaure peut ne pas avoir de logo -> retour a l'etape des documents.
    if (step === 5) {
      const manquants = validateChamps(CHAMPS_DOCUMENTS, form, docs)
      if (Object.keys(manquants).length) {
        notify.warning('Documents manquants', "Joignez tous les documents obligatoires, dont le logo, avant de soumettre.")
        return retourDocuments(manquants)
      }
    }

    setErrors({})
    setBusy(true)
    try {
      if (step < 4) {
        await enregistrer(STEP_SECTIONS[step])
        setStep(step + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (step === 4) {
        setStep(5) // documents deja enregistres un par un
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const g = geoRef.current
        const id = g ? await enregistrer([], g) : uuid
        const captchaToken = await getCaptchaToken('demande')
        const res = await demandeService.soumettre(id, captchaToken)
        clearDraft()
        setDone({ reference: (res?.demandeUuid ?? id).slice(0, 8).toUpperCase(), date: res?.dateSoumission })
        notify.success('Demande soumise', 'Un message de confirmation vous est envoyé par WhatsApp et par e-mail.')
      }
    } catch (err) {
      // Le serveur refuse la soumission sans logo : 422, details.error.details['documents.logo']
      const logoRefuse = err?.details?.error?.details?.['documents.logo']
      if (logoRefuse) {
        notify.warning('Logo manquant', "Le logo de l'établissement est obligatoire pour soumettre la demande.")
        retourDocuments({ [DOC_TYPES.logo.champ]: Array.isArray(logoRefuse) ? logoRefuse[0] : String(logoRefuse) })
      } else {
        notify.fromError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    // Supprimer le brouillon côté serveur si un UUID existe
    if (uuid) {
      try {
        await demandeService.supprimerBrouillon(uuid)
      } catch {
        // Pas bloquant : on efface le local quand même
      }
    }
    clearDraft()
    setForm(EMPTY_FORM); setDocs({}); setUuid(null); setStep(1); setErrors({}); setSavedAt(null); setAskReset(false)
    notify.info('Nouvelle demande', 'Le brouillon a été effacé.')
  }

  /* ---------------- Écran de confirmation finale ---------------- */
  if (done) {
    return (
      <main className="dm-page">
        <section className="dm-card dm-card--center">
          <div className="dm-bigicon"><CircleCheck size={40} /></div>
          <h1 className="dm-title">Demande envoyée</h1>
          <p className="dm-sub">Votre demande d'inscription a bien été reçue et sera examinée par notre équipe.</p>
          <p className="dm-ref">Référence du dossier <strong>{done.reference}</strong></p>
          <p className="dm-sub">Une confirmation vous est envoyée par WhatsApp et par e-mail, à l'établissement comme au dirigeant. Si des corrections sont nécessaires, vous recevrez un lien pour modifier votre dossier, sans vous reconnecter.</p>
          <Link to={LOGIN_PATH} className="dm-btn">Aller à la connexion</Link>
        </section>
      </main>
    )
  }

  const [title, sub] = TITLES[step]
  const stepProps = { form, set, errors, locked: () => false, flags: {}, docs, onDoc, demandeUuid: uuid }
  const progress = Math.round(((step - 1) / (STEPS.length - 1)) * 100)

  return (
    <main className="dm-page">
      <section className="dm-card">

        {/* ── Panneau gauche : stepper vertical ── */}
        <aside className="dm-sidebar">
          <div className="dm-sidebar-header">
            <div className="dm-sidebar-logo-wrap">
              <img className="dm-sidebar-logo" src="/sigapei.png" alt={ENV.appName} />
            </div>
            <div className="dm-sidebar-texts">
              <p className="dm-sidebar-title">Inscrire mon établissement</p>
              <p className="dm-sidebar-sub">Demande d'inscription sur {ENV.appName}</p>
            </div>
          </div>
          <Stepper steps={STEPS} current={step} onGo={(id) => { setErrors({}); setStep(id) }} />
          <Link to={HOME_PATH} className="dm-back-home">
            <House size={14} /> Retour à l'accueil
          </Link>
        </aside>

        {/* ── Panneau droit : formulaire ── */}
        <div className="dm-panel">
          <header className="dm-head">
            <div className="dm-head-texts">
              <h1 className="dm-title">{title}</h1>
              <p className="dm-sub">{sub}</p>
            </div>
            <div className="dm-head-actions">
              {/* Bouton accueil visible uniquement sur mobile (sidebar masquée) */}
              <Link to={HOME_PATH} className="dm-btn-icon dm-btn-icon--mobile" aria-label="Retour à l'accueil">
                <House size={16} />
              </Link>
              {!isEmptyDraft(form, uuid) && (
                <button type="button" className="dm-link dm-reset" onClick={() => setAskReset(true)}>
                  <RotateCcw size={15} /> Recommencer
                </button>
              )}
            </div>
          </header>

          {/* Barre de progression */}
          <div className="dm-progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="dm-body">
            {step === 1 && <StepEtablissement {...stepProps} />}
            {step === 2 && <StepLocalisation {...stepProps} />}
            {step === 3 && <StepDirigeant {...stepProps} />}
            {step === 4 && <StepDocuments {...stepProps} />}
            {step === 5 && <StepConfirmation {...stepProps} />}
          </div>

          <footer className="dm-actions">
            {step > 1 ? (
              <button type="button" className="dm-btn dm-btn--ghost" onClick={() => { setErrors({}); setStep(step - 1) }} disabled={busy}>
                <ArrowLeft size={17} /> Précédent
              </button>
            ) : <span />}

            {savedAt && (
              <small className="dm-saved">
                Brouillon enregistré à {new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </small>
            )}

            <button type="button" className="dm-btn dm-btn--gold" onClick={next} disabled={busy}>
              {busy ? <><Loader mode="button" /> Veuillez patienter…</> : step === 5
                ? <>Soumettre ma demande <Send size={17} /></>
                : <>Suivant <ArrowRight size={17} /></>}
            </button>
          </footer>

          <p className="dm-foot">
            Vous avez déjà un compte ? <Link to={LOGIN_PATH} className="dm-link">Se connecter</Link>
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={askReset}
        tone="danger"
        title="Recommencer la demande ?"
        message="Le brouillon actuel sera effacé de cet appareil."
        confirmLabel="Effacer et recommencer"
        onConfirm={reset}
        onCancel={() => setAskReset(false)}
      />

      {/* Overlay de chargement lors de la soumission finale */}
      {busy && step === 5 && <Loader label="Envoi de votre demande…" />}
    </main>
  )
}