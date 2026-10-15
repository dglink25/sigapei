import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck, Clock, Lock, LinkIcon, Send, TriangleAlert, House } from 'lucide-react'
import { ENV } from '../../config/commun/env'
import { useNotify } from '../../context/commun/NotifyContext'
import { SECTIONS, SECTION_OF } from '../../config/etablissements/config'
import { EMPTY_FORM, champOf, correctionPayload, normaliserDemande, validateChamps } from '../../lib/etablissements/form'
import { correctionService } from '../../services/etablissements/etablissement.service'
import { StepDirigeant, StepDocuments, StepEtablissement, StepLocalisation } from '../../components/etablissements/FormSteps'
import ThemeToggle from '../../components/commun/ThemeToggle'
import Loader from '../../components/commun/Loader'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './etablissements.css'

const COMPONENTS = {
  etablissement: StepEtablissement,
  localisation:  StepLocalisation,
  dirigeant:     StepDirigeant,
  documents:     StepDocuments,
}

const tokenInvalide = (err) =>
  err?.code === 'LIEN_CORRECTION_INVALIDE' || err?.status === 404 || Boolean(err?.details?.error?.details?.token)

/* ── Layout feedback centré (erreur / succès / lien invalide) ── */
function Shell({ children }) {
  return (
    <main className="dm-page">
      <section className="dm-card dm-card--center">
        <img className="dm-logo" src="/sigapei.png" alt={ENV.appName} style={{ height: 52, marginBottom: 8 }} />
        {children}
      </section>
    </main>
  )
}

export default function CorrectionPage() {
  const { token } = useParams()
  const notify = useNotify()

  const [state,    setState]   = useState({ phase: 'loading' })
  const [demande,  setDemande] = useState(null)
  const [form,     setForm]    = useState(EMPTY_FORM)
  const [docs,     setDocs]    = useState({})
  const [replaced, setReplaced] = useState(false)
  const [errors,   setErrors]  = useState({})
  const [busy,     setBusy]    = useState(false)
  usePageTitle('Corriger ma demande')

  const load = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await correctionService.afficher(token)
      const d = normaliserDemande({
        uuid: res.demandeUuid,
        donneesFormulaire: res.donneesFormulaire,
        champsACorriger:   res.champsACorriger,
      })
      setDemande(d)
      setForm(d.form)
      setDocs({})
      setState({ phase: Object.keys(d.flags).length ? 'ready' : 'invalid', reason: 'aucun' })
    } catch (err) {
      setState(tokenInvalide(err) ? { phase: 'invalid', reason: 'expire' } : { phase: 'error', error: err })
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const flags  = demande?.flags ?? {}
  const locked = (k) => !(SECTION_OF[k] in flags)

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
    if (v?.status === 'done') setReplaced(true)
    setErrors((e) => ({ ...e, documents: undefined }))
  }, [])

  async function submit() {
    const errs = {}
    Object.keys(flags).forEach((s) => {
      if (s === 'documents') {
        if (Object.values(docs).some((d) => d?.status === 'uploading')) errs.documents = 'Téléversement en cours…'
        else if (!replaced) errs.documents = 'Téléversez au moins un document corrigé.'
      } else {
        Object.assign(errs, validateChamps(SECTIONS.find((x) => x.id === s)?.champs ?? [], form, docs))
      }
    })
    if (Object.keys(errs).length) {
      setErrors(errs)
      notify.warning('Corrections incomplètes', "Veuillez corriger tous les éléments signalés avant d'envoyer.")
      return setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
    setBusy(true)
    try {
      await correctionService.soumettre(token, correctionPayload(form, flags))
      setState({ phase: 'done' })
      notify.success('Corrections envoyées', 'Votre dossier repasse en instruction.')
    } catch (err) {
      if (tokenInvalide(err)) setState({ phase: 'invalid', reason: 'expire' })
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* ── États de feedback ── */
  if (state.phase === 'loading') return <Loader label="Chargement de votre dossier…" />

  if (state.phase === 'invalid') {
    return (
      <Shell>
        <div className="dm-bigicon dm-bigicon--warn"><LinkIcon size={40} /></div>
        <h1 className="dm-title">
          {state.reason === 'aucun' ? 'Aucune correction à effectuer' : 'Lien invalide, expiré ou déjà utilisé'}
        </h1>
        <p className="dm-sub">
          {state.reason === 'aucun'
            ? "Votre dossier n'attend aucune correction pour le moment."
            : "Ce lien n'est plus valide (72 h, usage unique). Tant que votre dossier attend une correction, un nouveau lien vous est envoyé chaque jour à 18h59."}
        </p>
        <Link to="/" className="dm-btn">Retour à l'accueil</Link>
      </Shell>
    )
  }

  if (state.phase === 'error') {
    return (
      <Shell>
        <div className="dm-bigicon dm-bigicon--warn"><TriangleAlert size={40} /></div>
        <h1 className="dm-title">{state.error?.title ?? 'Chargement impossible'}</h1>
        <p className="dm-sub">{state.error?.message ?? 'Une erreur est survenue.'}</p>
        <button type="button" className="dm-btn" onClick={load}>Réessayer</button>
      </Shell>
    )
  }

  if (state.phase === 'done') {
    return (
      <Shell>
        <div className="dm-bigicon"><CircleCheck size={44} /></div>
        <h1 className="dm-title">Corrections envoyées</h1>
        <p className="dm-sub">
          Merci. Votre dossier <strong>{demande?.reference}</strong> repasse en instruction et les
          rappels quotidiens sont arrêtés. Vous serez informé de la décision par WhatsApp et par e-mail.
        </p>
        <Link to="/" className="dm-btn">Retour à l'accueil</Link>
      </Shell>
    )
  }

  /* ── Formulaire principal - même layout que DemandePage ── */
  const shared = { form, set, errors, locked, flags: {}, docs, onDoc, demandeUuid: demande.uuid }
  const flagged = Object.entries(flags)

  return (
    <main className="dm-page">
      <section className="dm-card">

        {/* ── Sidebar gauche ── */}
        <aside className="dm-sidebar">
          <div className="dm-sidebar-header">
            <div className="dm-sidebar-logo-wrap">
              <img className="dm-sidebar-logo" src="/sigapei.png" alt={ENV.appName} />
            </div>
            <div className="dm-sidebar-texts">
              <p className="dm-sidebar-title">Corriger ma demande</p>
              <p className="dm-sidebar-sub">Dossier {demande.reference}</p>
            </div>
          </div>

          {/* Sections à corriger */}
          <nav className="dm-stepper" aria-label="Sections">
            {SECTIONS.filter((s) => s.id !== 'documents' || 'documents' in flags).map((s) => {
              const isFlagged = s.id in flags
              return (
                <div
                  key={s.id}
                  className={`dm-step ${isFlagged ? 'is-active' : 'is-done'}`}
                >
                  <button type="button" disabled={!isFlagged} tabIndex={-1}>
                    <span className="dm-step-dot">
                      {isFlagged ? <TriangleAlert size={13} /> : <Lock size={13} />}
                    </span>
                    <span className="dm-step-info">
                      <span className="dm-step-label">{s.titre}</span>
                      <span className="dm-step-sublabel">
                        {isFlagged ? 'À corriger' : 'Lecture seule'}
                      </span>
                    </span>
                  </button>
                </div>
              )
            })}
          </nav>

          <Link to="/" className="dm-back-home">
            <House size={14} /> Retour à l'accueil
          </Link>
        </aside>

        {/* ── Panneau droit ── */}
        <div className="dm-panel">

          {/* Header */}
          <header className="dm-head">
            <div className="dm-head-texts">
              <h1 className="dm-title">Corriger ma demande</h1>
              <p className="dm-sub">
                Dossier <strong>{demande.reference}</strong>
                {form.nom ? ` · ${form.nom}` : ''}
              </p>
            </div>
            <div className="dm-head-actions">
              <ThemeToggle />
              <Link to="/" className="dm-btn-icon dm-btn-icon--mobile" aria-label="Retour à l'accueil">
                <House size={16} />
              </Link>
            </div>
          </header>

          {/* Alerte récap sections */}
          <div className="dm-alert">
            <TriangleAlert size={20} aria-hidden="true" />
            <div>
              <strong>{flagged.length} section{flagged.length > 1 ? 's' : ''} à corriger</strong>
              <ul>
                {flagged.map(([s, motif]) => (
                  <li key={s}>
                    <strong>{SECTIONS.find((x) => x.id === s)?.titre ?? s}</strong>
                    {motif ? ` : ${motif}` : ''}
                  </li>
                ))}
              </ul>
              <p className="dm-alert-note">
                Seules les sections signalées sont modifiables ; le reste du dossier est en lecture seule.
              </p>
              <p className="dm-alert-note">
                <Clock size={13} /> Ce lien est valable 72 heures et ne peut être utilisé qu'une seule fois.
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="dm-body">
            {SECTIONS.filter((s) => s.id !== 'documents' || 'documents' in flags).map((s) => {
              const Comp      = COMPONENTS[s.id]
              const isFlagged = s.id in flags
              return (
                <div key={s.id} className={`dm-corr-section ${isFlagged ? 'is-flagged' : 'is-locked'}`}>
                  <div className="dm-section-head dm-section-head--row">
                    <h2>{s.titre}</h2>
                    {isFlagged
                      ? <span className="dm-tag dm-tag--warn">À corriger</span>
                      : <span className="dm-tag"><Lock size={12} /> Lecture seule</span>}
                  </div>
                  {isFlagged && flags[s.id] && (
                    <p className="dm-motif dm-motif--block">
                      <TriangleAlert size={15} />
                      <span><strong>Motif :</strong> {flags[s.id]}</span>
                    </p>
                  )}
                  {s.id === 'documents' && errors.documents && (
                    <p className="dm-error" role="alert">{errors.documents}</p>
                  )}
                  <Comp {...shared} />
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <footer className="dm-actions dm-actions--end">
            <button type="button" className="dm-btn dm-btn--gold" onClick={submit} disabled={busy}>
              {busy
                ? <><Loader mode="button" /> Envoi en cours…</>
                : <>Envoyer mes corrections <Send size={17} /></>}
            </button>
          </footer>

          <p className="dm-foot">
            Des questions ? Contactez <a href="mailto:support@sigapei.com" className="dm-link">support@sigapei.com</a>
          </p>
        </div>
      </section>

      {busy && <Loader label="Envoi de vos corrections…" />}
    </main>
  )
}
