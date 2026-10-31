import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, Lock, MapPin, RotateCcw, Save, TriangleAlert, Upload } from 'lucide-react'
import { ENV } from '../../config/commun/env'
import { useNotify } from '../../context/commun/NotifyContext'
import { API_BASE, DOC_TYPES, TYPES } from '../../config/etablissements/config'
import { champOf } from '../../lib/etablissements/form'
import { captureGeolocation } from '../../lib/etablissements/geoloc'
import { diffPayload, erreursServeur, profilVersForm, typesRetires, validerProfil } from '../../lib/etablissements/profil'
import { validateFile } from '../../lib/etablissements/upload'
import { uploadLogo } from '../../lib/etablissements/uploadLogo'
import { monEtablissementService } from '../../services/etablissements/monEtablissement.service'
import ConfirmDialog from '../commun/ConfirmDialog'
import Loader from '../commun/Loader'
import GeoSelects from './GeoSelects'
import { Field } from './ui'
import '../../pages/etablissements/Etablissements.css'
import './InfosEtablissementPanel.css'

const typeLabel = (id) => TYPES.find((t) => t.id === id)?.label ?? id
const logoUrl = (id) => (id ? `${API_BASE}${ENV.apiPrefix}/documents/${id}` : '')

function Lecture({ label, valeur }) {
  return (
    <div className="ie-ro-row">
      <dt>{label}</dt>
      <dd>{valeur || '-'}</dd>
    </div>
  )
}

/**
 * « Informations de l'établissement » : réservé à l'administrateur de l'établissement.
 * Modifiables : logo, types, adresse, localisation, GPS. Nom, code, matricule, slug, année d'ouverture,
 * contacts et infos du dirigeant sont en lecture seule (le serveur les refuse de toute façon).
 */
export default function InfosEtablissementPanel() {
  const notify = useNotify()
  const [etat, setEtat] = useState({ phase: 'loading' })
  const [profil, setProfil] = useState(null)
  const [initial, setInitial] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [serveur, setServeur] = useState([])
  const [busy, setBusy] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [logo, setLogo] = useState({ progress: null, error: '' })
  const [geoBusy, setGeoBusy] = useState(false)
  const fileRef = useRef(null)

  const appliquer = useCallback((p) => {
    const f = profilVersForm(p)
    setProfil(p)
    setInitial(f)
    setForm(f)
    setErrors({})
    setServeur([])
  }, [])

  const charger = useCallback(async () => {
    setEtat({ phase: 'loading' })
    try {
      appliquer(await monEtablissementService.lire())
      setEtat({ phase: 'ready' })
    } catch (err) {
      notify.fromError(err)
      setEtat({ phase: 'error' })
    }
  }, [appliquer, notify])

  useEffect(() => { charger() }, [charger])

  const set = useCallback((patch) => {
    setForm((p) => ({ ...p, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[champOf(k) === 'localisation' ? 'localisation' : k])
      delete next.general
      return next
    })
  }, [])

  const payload = useMemo(() => (form && initial ? diffPayload(initial, form) : {}), [form, initial])
  const modifie = Object.keys(payload).length > 0
  const retires = useMemo(() => (form && initial ? typesRetires(initial, form) : []), [form, initial])

  const toggleType = (id) => set({ types: form.types.includes(id) ? form.types.filter((t) => t !== id) : [...form.types, id] })

  async function utiliserPosition() {
    setGeoBusy(true)
    try {
      const g = await captureGeolocation()
      if (g?.latitude != null && g?.longitude != null) {
        setForm((p) => ({ ...p, latitude: String(Number(g.latitude.toFixed(7))), longitude: String(Number(g.longitude.toFixed(7))) }))
        setErrors((e) => ({ ...e, gps: undefined }))
      } else {
        notify.warning('Position indisponible', "Autorisez la géolocalisation dans votre navigateur, ou saisissez les coordonnées à la main.")
      }
    } finally {
      setGeoBusy(false)
    }
  }

  async function enregistrer() {
    setConfirmer(false)
    setBusy(true)
    setServeur([])
    try {
      appliquer(await monEtablissementService.modifier(payload))
      notify.success('Informations enregistrées', 'Les modifications sont déjà visibles sur la page publique de votre établissement.')
    } catch (err) {
      const details = err?.status === 422 ? err?.details?.error?.details : null
      if (details && typeof details === 'object') {
        const { errors: e, messages } = erreursServeur(details)
        setErrors(e)
        setServeur(messages)
        notify.warning('Modification refusée', 'Veuillez corriger les éléments signalés.')
      } else {
        notify.fromError(err)
      }
    } finally {
      setBusy(false)
    }
  }

  function soumettre() {
    const errs = validerProfil(initial, form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      notify.warning('Formulaire incomplet', 'Veuillez corriger les champs signalés avant d’enregistrer.')
      return setTimeout(() => document.querySelector('.ie .has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
    if (retires.length) return setConfirmer(true) // retrait d'un type : confirmation explicite
    return enregistrer()
  }

  async function choisirLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const erreur = validateFile('logo', file)
    if (erreur) return setLogo({ progress: null, error: erreur })
    setLogo({ progress: 0, error: '' })
    try {
      const r = await uploadLogo({ file, onProgress: (p) => setLogo({ progress: p, error: '' }) })
      setProfil((p) => ({ ...p, logoDocumentId: r?.logoDocumentId ?? p.logoDocumentId }))
      setLogo({ progress: null, error: '' })
      notify.success('Logo mis à jour', "Le nouveau logo remplace l'ancien. Rechargez la page pour le voir dans l'en-tête.")
    } catch (err) {
      setLogo({ progress: null, error: err?.message || "Le logo n'a pas pu être envoyé." })
      if (err?.status !== 422) notify.fromError(err)
    }
  }

  if (etat.phase === 'loading') return <Loader mode="inline" label="Chargement des informations…" />

  if (etat.phase === 'error') {
    return (
      <div className="ie-etat" role="status">
        <p>Impossible de charger les informations de l'établissement.</p>
        <button type="button" className="dm-btn" onClick={charger}>Réessayer</button>
      </div>
    )
  }

  const actif = profil.statut === 'actif'
  const verrou = !actif || busy
  const contact = profil.contact ?? {}
  const urlLogo = logoUrl(profil.logoDocumentId)
  const envoiLogo = logo.progress !== null

  return (
    <div className="ie">
      {!actif && (
        <div className="ie-notice" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>Votre établissement n'est pas actif pour le moment : ses informations ne peuvent pas être modifiées.</span>
        </div>
      )}

      {serveur.length > 0 && (
        <div className="ie-notice ie-notice--erreur" role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          <ul>{serveur.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      {/* ── Logo ── */}
      <section className="ie-card">
        <h3 className="ie-titre">Logo</h3>
        <div className="ie-logo">
          <div className="ie-logo-apercu">
            {urlLogo ? <img src={urlLogo} alt={`Logo de ${profil.nom}`} /> : <ImageIcon size={32} aria-hidden="true" />}
          </div>
          <div className="ie-logo-actions">
            <input ref={fileRef} type="file" hidden accept={DOC_TYPES.logo.mimes.join(',')} onChange={choisirLogo} />
            <button type="button" className="dm-btn dm-btn--ghost" onClick={() => fileRef.current?.click()} disabled={!actif || envoiLogo}>
              {envoiLogo ? <><Loader mode="button" /> Envoi… {logo.progress}%</> : <><Upload size={16} /> {urlLogo ? 'Changer le logo' : 'Ajouter un logo'}</>}
            </button>
            <p className="dm-hint">PNG, JPG ou WebP, {DOC_TYPES.logo.maxMo} Mo maximum. L'ancien logo est remplacé.</p>
            {logo.error && <p className="dm-error" role="alert">{logo.error}</p>}
          </div>
        </div>
      </section>

      {/* ── Informations modifiables ── */}
      <section className="ie-card">
        <h3 className="ie-titre">Informations modifiables</h3>
        <div className="dm-grid">
          <Field label="Type d'établissement" required hint="Retirer un type désactive ses cycles (ils ne sont pas supprimés)." className="dm-span" error={errors.types}>
            <div className="dm-chips" role="group" aria-label="Type d'établissement">
              {TYPES.map((t) => (
                <label key={t.id} className={`dm-chip ${form.types.includes(t.id) ? 'is-on' : ''} ${verrou ? 'is-disabled' : ''}`}>
                  <input type="checkbox" checked={form.types.includes(t.id)} onChange={() => toggleType(t.id)} disabled={verrou} />
                  {t.label}
                </label>
              ))}
            </div>
          </Field>

          <Field className="dm-span" error={errors.localisation}>
            <GeoSelects value={form} libre={form.localisation_libre} onChange={set} disabled={verrou} />
          </Field>

          <Field id="ie-adresse" label="Adresse complète" required hint="Rue, numéro ou repère." className="dm-span" error={errors.adresse_complete}>
            <textarea id="ie-adresse" className="dm-input" rows={3} value={form.adresse_complete} onChange={(e) => set({ adresse_complete: e.target.value })} disabled={verrou} />
          </Field>

          <Field id="ie-lat" label="Latitude" error={errors.gps && !form.longitude ? errors.gps : undefined}>
            <input id="ie-lat" className="dm-input" inputMode="decimal" value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} disabled={verrou} placeholder="6.3702930" />
          </Field>
          <Field id="ie-lon" label="Longitude" error={errors.gps && form.longitude ? errors.gps : undefined}>
            <input id="ie-lon" className="dm-input" inputMode="decimal" value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} disabled={verrou} placeholder="2.3912360" />
          </Field>
          <div className="dm-span ie-geo">
            <button type="button" className="dm-btn dm-btn--ghost" onClick={utiliserPosition} disabled={verrou || geoBusy}>
              {geoBusy ? <><Loader mode="button" /> Localisation…</> : <><MapPin size={16} /> Utiliser ma position actuelle</>}
            </button>
            <small className="dm-hint">Les coordonnées ne sont jamais affichées publiquement.</small>
          </div>
        </div>

        <div className="ie-actions">
          <button type="button" className="dm-btn dm-btn--ghost" onClick={() => { setForm(initial); setErrors({}); setServeur([]) }} disabled={!modifie || verrou}>
            <RotateCcw size={16} /> Annuler les modifications
          </button>
          <button type="button" className="dm-btn dm-btn--gold" onClick={soumettre} disabled={!modifie || verrou}>
            {busy ? <><Loader mode="button" /> Enregistrement…</> : <><Save size={16} /> Enregistrer</>}
          </button>
        </div>
      </section>

      {/* ── Lecture seule ── */}
      <section className="ie-card ie-card--ro">
        <h3 className="ie-titre"><Lock size={15} aria-hidden="true" /> Informations non modifiables</h3>
        <dl className="ie-ro">
          <Lecture label="Nom de l'établissement" valeur={profil.nom} />
          <Lecture label="Code public" valeur={profil.code} />
          <Lecture label="Identifiant de connexion (matricule)" valeur={profil.matricule} />
          <Lecture label="Adresse web (slug)" valeur={profil.slug} />
          <Lecture label="Année d'ouverture" valeur={profil.anneeOuverture} />
          <Lecture label="E-mail de contact" valeur={contact.email} />
          <Lecture label="Téléphone 1" valeur={contact.telephone1} />
          <Lecture label="Téléphone 2" valeur={contact.telephone2} />
        </dl>
        <p className="dm-hint">
          Pour modifier ces informations ou celles du dirigeant, contactez <a href="mailto:support@sigapei.com" className="dm-link">support@sigapei.com</a>.
        </p>
      </section>

      <ConfirmDialog
        open={confirmer}
        tone="danger"
        title="Retirer un type d'établissement ?"
        message={`Les cycles liés à « ${retires.map(typeLabel).join(', ')} » seront désactivés (pas supprimés). Vous pourrez les réactiver en ajoutant de nouveau le type.`}
        confirmLabel="Enregistrer quand même"
        onConfirm={enregistrer}
        onCancel={() => setConfirmer(false)}
      />
    </div>
  )
}