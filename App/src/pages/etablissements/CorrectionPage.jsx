import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleCheck, Clock, Lock, LinkIcon, Send, TriangleAlert } from 'lucide-react'
import { ENV } from '../../config/commun/env'
import { useNotify } from '../../context/commun/NotifyContext'
import { SECTIONS, SECTION_OF } from '../../config/etablissements/config'
import { EMPTY_FORM, champOf, correctionPayload, normaliserDemande, validateChamps } from '../../lib/etablissements/form'
import { correctionService } from '../../services/etablissements/etablissement.service'
import { StepDirigeant, StepDocuments, StepEtablissement, StepLocalisation } from '../../components/etablissements/FormSteps'
import './etablissements.css'

const COMPONENTS = { etablissement: StepEtablissement, localisation: StepLocalisation, dirigeant: StepDirigeant, documents: StepDocuments }
const tokenInvalide = (err) => err?.code === 'LIEN_CORRECTION_INVALIDE' || err?.status === 404 || Boolean(err?.details?.error?.details?.token)

function Shell({ children, center }) {
  return (
    <main className="dm-page">
      <section className={`dm-card ${center ? 'dm-card--center' : ''}`}>
        <img className="dm-logo" src="/sigapei.png" alt={ENV.appName} />
        {children}
      </section>
    </main>
  )
}

/**
 * Page PUBLIQUE (sans connexion) ouverte depuis le lien signe recu par WhatsApp / e-mail.
 * Seules les sections marquees « a corriger » sont modifiables ; les autres sont en lecture seule.
 */
export default function CorrectionPage() {
  const { token } = useParams()
  const notify = useNotify()
  const [state, setState] = useState({ phase: 'loading' }) // loading | ready | invalid | error | done
  const [demande, setDemande] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [docs, setDocs] = useState({})
  const [replaced, setReplaced] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await correctionService.afficher(token)
      const d = normaliserDemande({ uuid: res.demandeUuid, donneesFormulaire: res.donneesFormulaire, champsACorriger: res.champsACorriger })
      setDemande(d)
      setForm(d.form)
      setDocs({})
      setState({ phase: Object.keys(d.flags).length ? 'ready' : 'invalid', reason: 'aucun' })
    } catch (err) {
      setState(tokenInvalide(err) ? { phase: 'invalid', reason: 'expire' } : { phase: 'error', error: err })
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const flags = demande?.flags ?? {}
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
      notify.warning('Corrections incomplètes', 'Veuillez corriger tous les éléments signalés avant d’envoyer.')
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

  if (state.phase === 'loading') return <Shell center><p className="dm-sub">Chargement de votre dossier…</p></Shell>

  if (state.phase === 'invalid') {
    return (
      <Shell center>
        <div className="dm-bigicon dm-bigicon--warn"><LinkIcon size={40} /></div>
        <h1 className="dm-title">{state.reason === 'aucun' ? 'Aucune correction à effectuer' : 'Lien invalide, expiré ou déjà utilisé'}</h1>
        <p className="dm-sub">
          {state.reason === 'aucun'
            ? "Votre dossier n'attend aucune correction pour le moment."
            : 'Ce lien de correction n’est plus valide (valable 72 heures, à usage unique). Tant que votre dossier attend une correction, un nouveau lien vous est envoyé par WhatsApp et par e-mail chaque jour à 18h59.'}
        </p>
        <Link to="/" className="dm-btn">Retour à l'accueil</Link>
      </Shell>
    )
  }

  if (state.phase === 'error') {
    return (
      <Shell center>
        <div className="dm-bigicon dm-bigicon--warn"><TriangleAlert size={40} /></div>
        <h1 className="dm-title">{state.error?.title ?? 'Chargement impossible'}</h1>
        <p className="dm-sub">{state.error?.message ?? 'Une erreur est survenue.'}</p>
        <button type="button" className="dm-btn" onClick={load}>Réessayer</button>
      </Shell>
    )
  }

  if (state.phase === 'done') {
    return (
      <Shell center>
        <div className="dm-bigicon"><CircleCheck size={44} /></div>
        <h1 className="dm-title">Corrections envoyées</h1>
        <p className="dm-sub">Merci. Votre dossier <strong>{demande?.reference}</strong> repasse en instruction et les rappels quotidiens sont arrêtés. Vous serez informé de la décision par WhatsApp et par e-mail.</p>
        <Link to="/" className="dm-btn">Retour à l'accueil</Link>
      </Shell>
    )
  }

  const shared = { form, set, errors, locked, flags: {}, docs, onDoc, demandeUuid: demande.uuid }
  const flagged = Object.entries(flags)

  return (
    <main className="dm-page">
      <section className="dm-card">
        <header className="dm-head">
          <img className="dm-logo" src="/sigapei.png" alt={ENV.appName} />
          <div>
            <h1 className="dm-title">Corriger ma demande</h1>
            <p className="dm-sub">Dossier {demande.reference}{form.nom ? ` · ${form.nom}` : ''}</p>
          </div>
        </header>

        <div className="dm-alert">
          <TriangleAlert size={22} aria-hidden="true" />
          <div>
            <strong>{flagged.length} section{flagged.length > 1 ? 's' : ''} à corriger</strong>
            <ul>
              {flagged.map(([s, motif]) => (
                <li key={s}><strong>{SECTIONS.find((x) => x.id === s)?.titre ?? s}</strong>{motif ? ` : ${motif}` : ''}</li>
              ))}
            </ul>
            <p className="dm-alert-note">Seules les sections signalées sont modifiables ; le reste du dossier est en lecture seule.</p>
            <p className="dm-alert-note"><Clock size={14} /> Ce lien est valable 72 heures et ne peut être utilisé qu'une seule fois.</p>
          </div>
        </div>

        {SECTIONS.filter((s) => s.id !== 'documents' || 'documents' in flags).map((s) => {
          const Comp = COMPONENTS[s.id]
          const isFlagged = s.id in flags
          return (
            <div key={s.id} className={`dm-corr-section ${isFlagged ? 'is-flagged' : 'is-locked'}`}>
              <div className="dm-section-head dm-section-head--row">
                <h2>{s.titre}</h2>
                {isFlagged ? <span className="dm-tag dm-tag--warn">À corriger</span> : <span className="dm-tag"><Lock size={12} /> Lecture seule</span>}
              </div>
              {isFlagged && flags[s.id] && <p className="dm-motif dm-motif--block"><TriangleAlert size={16} /><span><strong>Motif :</strong> {flags[s.id]}</span></p>}
              {s.id === 'documents' && errors.documents && <p className="dm-error" role="alert">{errors.documents}</p>}
              <Comp {...shared} />
            </div>
          )
        })}

        <footer className="dm-actions dm-actions--end">
          <button type="button" className="dm-btn" onClick={submit} disabled={busy}>
            {busy ? 'Envoi…' : <>Envoyer mes corrections <Send size={18} /></>}
          </button>
        </footer>
      </section>
    </main>
  )
}
