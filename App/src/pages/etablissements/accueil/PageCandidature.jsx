/**
 * PageCandidature - Formulaire public de candidature dynamique.
 *
 * Génération rigoureuse :
 *  - Seuls les champs correspondant aux critères configurés par l'établissement sont affichés
 *  - Les champs marqués obligatoires dans le critère le sont aussi dans le formulaire
 *  - Les numéros de téléphone utilisent PhoneInput (indicatifs) comme dans AuthPage
 *  - Les pièces à fournir listent uniquement les obligatoires en priorité
 *  - reCAPTCHA Enterprise avant soumission
 *  - Erreurs via NoticeModal
 *
 * URL : /etablissements/:slug/candidature?appel={uuid}
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { isValidPhoneNumber, getExampleNumber, getCountryCallingCode } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import flags from 'react-phone-number-input/flags'
import { ArrowLeft, CheckCircle2, Paperclip, ShieldCheck } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import NoticeModal from '../../../components/commun/NoticeModal'
import { useAccueil } from './AccueilLayout'
import { appelsPublicsService } from '../../../services/inscription/appelsPublics.service'
import { candidaturePubliqueService } from '../../../services/inscription/candidaturePublique.service'
import { getCaptchaToken } from '../../../lib/identite/captcha'
import usePageTitle from '../../../hooks/commun/usePageTitle'

/* ── Badge reCAPTCHA ── */
function useRecaptchaBadge() {
  useEffect(() => {
    document.body.classList.add('page-public-recaptcha')
    return () => document.body.classList.remove('page-public-recaptcha')
  }, [])
}

/* ══════════════════════════════════════════════════════════
   Définition des champs par type de critère
   Chaque critère de l'appel peut imposer required=true
══════════════════════════════════════════════════════════ */

/**
 * Génère la liste de champs à partir des critères configurés par l'établissement.
 * - L'identité (nom/prénom/sexe) est toujours présente
 * - Chaque critère ajoute ses propres champs
 * - Le caractère obligatoire provient du critère (c.obligatoire)
 * - Aucun champ "par défaut" non demandé n'est ajouté
 */
function genererChamps(appel) {
  const criteres = Array.isArray(appel?.criteres_eligibilite) ? appel.criteres_eligibilite : []

  // Champs identité toujours présents (obligatoires)
  const champs = [
    { id: 'nom',    label: 'Nom',    type: 'text',   required: true,  placeholder: 'Nom de famille' },
    { id: 'prenom', label: 'Prénom', type: 'text',   required: true,  placeholder: 'Prénom(s)' },
    { id: 'sexe',   label: 'Sexe',  type: 'select', required: false,
      options: [{ v: '', l: '-' }, { v: 'M', l: 'Masculin' }, { v: 'F', l: 'Féminin' }] },
  ]

  const ajoutes = new Set(['nom', 'prenom', 'sexe'])

  for (const crit of criteres) {
    const obligatoire = crit.obligatoire !== false // true par défaut

    switch (crit.type) {

      case 'age':
        if (!ajoutes.has('date_naissance')) {
          champs.push({ id: 'date_naissance', label: 'Date de naissance', type: 'date', required: obligatoire })
          ajoutes.add('date_naissance')
        }
        break

      case 'type_inscription':
        if (!ajoutes.has('type_inscription')) {
          champs.push({
            id: 'type_inscription', label: "Modalité d'admission", type: 'select', required: obligatoire,
            options: [
              { v: '', l: '-' },
              { v: 'premiere',     l: 'Première inscription' },
              { v: 'transfert',    l: 'Transfert' },
              { v: 'reinscription', l: 'Réinscription' },
            ],
          })
          ajoutes.add('type_inscription')
        }
        break

      case 'niveau_scolaire':
        if (!ajoutes.has('niveau_precedent')) {
          champs.push({ id: 'niveau_precedent', label: 'Niveau scolaire précédent', type: 'text', required: obligatoire, placeholder: 'Ex. CE2, 3ème, Terminale…', fullWidth: true })
          ajoutes.add('niveau_precedent')
        }
        if (!ajoutes.has('etablissement_precedent')) {
          champs.push({ id: 'etablissement_precedent', label: 'Établissement précédent', type: 'text', required: false, placeholder: "Nom de l'établissement", fullWidth: true })
          ajoutes.add('etablissement_precedent')
        }
        break

      case 'contact':
        if (!ajoutes.has('telephone')) {
          champs.push({ id: 'telephone', label: 'Téléphone', type: 'tel', required: obligatoire, placeholder: '+229…' })
          ajoutes.add('telephone')
        }
        if (!ajoutes.has('email')) {
          champs.push({ id: 'email', label: 'Email', type: 'email', required: false, placeholder: 'email@exemple.com' })
          ajoutes.add('email')
        }
        break

      case 'adresse':
        if (!ajoutes.has('adresse')) {
          champs.push({ id: 'adresse', label: 'Adresse', type: 'textarea', required: obligatoire, placeholder: 'Quartier, ville…', fullWidth: true })
          ajoutes.add('adresse')
        }
        break

      case 'parent_tuteur':
        for (const c of [
          { id: 'parent_nom',       label: 'Nom du parent / tuteur',    type: 'text',   required: obligatoire, placeholder: 'Nom' },
          { id: 'parent_prenom',    label: 'Prénom du parent / tuteur', type: 'text',   required: false, placeholder: 'Prénom' },
          { id: 'parent_lien',      label: 'Lien de parenté',           type: 'select', required: false,
            options: [{ v: '', l: '-' }, { v: 'pere', l: 'Père' }, { v: 'mere', l: 'Mère' }, { v: 'tuteur', l: 'Tuteur légal' }, { v: 'autre', l: 'Autre' }] },
          { id: 'parent_telephone', label: 'Téléphone du parent',       type: 'tel',    required: obligatoire, placeholder: '+229…' },
          { id: 'parent_email',     label: 'Email du parent',           type: 'email',  required: false, placeholder: 'email@exemple.com' },
        ]) {
          if (!ajoutes.has(c.id)) { champs.push(c); ajoutes.add(c.id) }
        }
        break

      default:
        break
    }
  }

  // Si aucun critère contact ni parent_tuteur → ajouter un téléphone contact minimal
  if (!ajoutes.has('telephone') && !ajoutes.has('parent_telephone')) {
    champs.push({ id: 'telephone', label: 'Téléphone de contact', type: 'tel', required: false, placeholder: '+229…' })
  }

  return champs
}

/* ══════════════════════════════════════════════════════════
   Champ téléphone avec sélecteur d'indicatif (PhoneInput)
══════════════════════════════════════════════════════════ */
function ChampTelephone({ id, label, required, erreur, value, onChange }) {
  const [country, setCountry] = useState('BJ')

  const example = useMemo(() => {
    try { return getExampleNumber(country, examples)?.formatNational() ?? '' } catch { return '' }
  }, [country])

  const dialCode = useMemo(() => {
    try { return getCountryCallingCode(country) } catch { return '' }
  }, [country])

  return (
    <div className="ap-field">
      <label className="ap-label" htmlFor={id}>
        {label}{required && <span style={{ color: '#c0392b' }}> *</span>}
      </label>
      <div className={`ap-phone-wrap${erreur ? ' has-error' : ''}`}>
        <PhoneInput
          id={id}
          defaultCountry="BJ"
          flags={flags}
          placeholder={example}
          value={value}
          onChange={onChange}
          onCountryChange={(c) => c && setCountry(c)}
          limitMaxLength
        />
      </div>
      {dialCode && (
        <p className="ap-hint">Indicatif +{dialCode}{example ? ` · ex. ${example}` : ''}</p>
      )}
      {erreur && <p className="ap-error">{erreur}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Composant principal
══════════════════════════════════════════════════════════ */
export default function PageCandidature() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { data, connecte, lienEspace } = useAccueil()
  const navigate = useNavigate()

  useRecaptchaBadge()

  const appelUuid = searchParams.get('appel')
  const base      = slug ? `/etablissements/${slug}` : ''

  const [appel,   setAppel]   = useState(null)
  const [loading, setLoading] = useState(!!appelUuid)
  const [envoi,   setEnvoi]   = useState(false)
  const [succes,  setSucces]  = useState(false)
  const [erreurs, setErreurs] = useState({})
  const [modal,   setModal]   = useState(null)

  usePageTitle(`Candidature - ${data?.nom ?? ''}`)

  useEffect(() => {
    if (!appelUuid) return
    appelsPublicsService.afficher(appelUuid)
      .then((a) => setAppel(a))
      .catch(() => setModal({
        type: 'warning',
        title: 'Appel introuvable',
        message: "Impossible de charger les détails de cet appel. Vous pouvez tout de même remplir le formulaire.",
      }))
      .finally(() => setLoading(false))
  }, [appelUuid])

  const champs = useMemo(() => genererChamps(appel), [appel])

  // Pièces : obligatoires en premier, puis les optionnelles
  const pieces = useMemo(() => {
    const liste = Array.isArray(appel?.pieces_a_fournir) ? appel.pieces_a_fournir : []
    return [...liste.filter((p) => p.obligatoire !== false), ...liste.filter((p) => p.obligatoire === false)]
  }, [appel])

  /* Formulaire initialisé selon les champs générés */
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm(Object.fromEntries(champs.map((c) => [c.id, ''])))
    setErreurs({})
  }, [champs])

  function setChamp(id, val) {
    setForm((f) => ({ ...f, [id]: val }))
    setErreurs((e) => { const n = { ...e }; delete n[id]; return n })
  }

  /* Validation */
  function valider() {
    const e = {}
    for (const c of champs) {
      if (!c.required) continue
      const val = form[c.id] ?? ''
      if (!val.toString().trim()) {
        e[c.id] = `${c.label} est obligatoire.`
        continue
      }
      // Validation spécifique téléphone
      if (c.type === 'tel' && val && !isValidPhoneNumber(val)) {
        e[c.id] = `${c.label} : numéro invalide.`
      }
    }
    setErreurs(e)
    if (Object.keys(e).length > 0) {
      setModal({ type: 'warning', title: 'Champs incomplets', message: 'Veuillez remplir tous les champs obligatoires.' })
      return false
    }
    return true
  }

  /* Soumission */
  async function soumettre(ev) {
    ev.preventDefault()
    if (!valider()) return
    setEnvoi(true)
    try {
      const captchaToken = await getCaptchaToken('candidature_publique')
      await candidaturePubliqueService.soumettre(slug, {
        ...form,
        appel_uuid:    appelUuid ?? undefined,
        captcha_token: captchaToken || undefined,
      })
      setSucces(true)
    } catch (err) {
      setModal({
        type:    'error',
        title:   err?.kind === 'captcha' ? 'Vérification de sécurité' : 'Erreur de soumission',
        message: err?.message ?? "Une erreur est survenue. Veuillez réessayer.",
      })
    } finally {
      setEnvoi(false)
    }
  }

  /* ── Écran succès ── */
  if (succes) {
    return (
      <>
        <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
          mode="page" titre="Candidature" page="formations" />
        <section className="ae2-section" style={{ minHeight: '50vh' }}>
          <div className="ae2-container" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 48 }}>
            <CheckCircle2 size={64} style={{ color: '#006B3C', marginBottom: 20 }} />
            <h2 style={{ margin: '0 0 12px', fontSize: '1.6rem' }}>Candidature envoyée !</h2>
            <p style={{ color: 'var(--sg-text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
              Votre dossier a bien été transmis à <strong>{data?.nom}</strong>.<br />
              Vous serez contacté(e) pour la suite de la procédure.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="ae2-btn ae2-btn--ghost" onClick={() => navigate(`${base}/formations`)}>
                <ArrowLeft size={15} /> Retour aux formations
              </button>
              <button type="button" className="ae2-btn"
                onClick={() => { setSucces(false); setForm(Object.fromEntries(champs.map((c) => [c.id, '']))) }}>
                Nouvelle candidature
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  /* ── Formulaire ── */
  return (
    <>
      <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
        mode="page" titre="Candidature" page="formations" />

      {modal && <NoticeModal type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal(null)} />}

      <section className="ae2-section" style={{ minHeight: '50vh' }}>
        <div className="ae2-container" style={{ maxWidth: 760 }}>

          <button type="button" className="ae2-btn ae2-btn--ghost" style={{ marginBottom: 28 }}
            onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Retour
          </button>

          {/* Infos de l'appel */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              <div className="ap-skel" style={{ height: 20, width: '60%', borderRadius: 6 }} />
              <div className="ap-skel" style={{ height: 14, width: '40%', borderRadius: 5 }} />
            </div>
          )}

          {appel && (
            <div style={{ background: 'rgba(0,107,60,0.06)', border: '1.5px solid rgba(0,107,60,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#006B3C', fontSize: '1rem' }}>{appel.titre}</p>
              {appel.description && (
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--sg-text-secondary)', lineHeight: 1.5 }}>
                  {appel.description}
                </p>
              )}
              {appel.est_payant && Number(appel.frais_dossier ?? appel.montant) > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', fontWeight: 700, color: '#E9AA20' }}>
                  Frais de dossier : {Number(appel.frais_dossier ?? appel.montant).toLocaleString('fr-FR')} {appel.devise ?? 'FCFA'}
                </p>
              )}
            </div>
          )}

          <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Formulaire de candidature</h2>
          <p style={{ margin: '0 0 28px', fontSize: '0.85rem', color: 'var(--sg-text-secondary)' }}>
            Les champs marqués <span style={{ color: '#c0392b', fontWeight: 700 }}>*</span> sont obligatoires.
          </p>

          {!loading && (
            <form onSubmit={soumettre} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {champs.map((c) => {
                  const erreur = erreurs[c.id]
                  const style = { gridColumn: c.fullWidth ? '1 / -1' : undefined }

                  /* ── Téléphone avec PhoneInput ── */
                  if (c.type === 'tel') {
                    return (
                      <div key={c.id} style={style}>
                        <ChampTelephone
                          id={c.id}
                          label={c.label}
                          required={c.required}
                          erreur={erreur}
                          value={form[c.id] ?? ''}
                          onChange={(val) => setChamp(c.id, val ?? '')}
                        />
                      </div>
                    )
                  }

                  /* ── Select ── */
                  if (c.type === 'select') {
                    return (
                      <div key={c.id} className="ap-field" style={style}>
                        <label className="ap-label" htmlFor={c.id}>
                          {c.label}{c.required && <span style={{ color: '#c0392b' }}> *</span>}
                        </label>
                        <select id={c.id} className={`ap-input${erreur ? ' has-error' : ''}`}
                          value={form[c.id] ?? ''} onChange={(e) => setChamp(c.id, e.target.value)}>
                          {c.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        {erreur && <p className="ap-error">{erreur}</p>}
                      </div>
                    )
                  }

                  /* ── Textarea ── */
                  if (c.type === 'textarea') {
                    return (
                      <div key={c.id} className="ap-field" style={style}>
                        <label className="ap-label" htmlFor={c.id}>
                          {c.label}{c.required && <span style={{ color: '#c0392b' }}> *</span>}
                        </label>
                        <textarea id={c.id} className={`ap-textarea${erreur ? ' has-error' : ''}`}
                          rows={3} placeholder={c.placeholder ?? ''}
                          value={form[c.id] ?? ''} onChange={(e) => setChamp(c.id, e.target.value)} />
                        {erreur && <p className="ap-error">{erreur}</p>}
                      </div>
                    )
                  }

                  /* ── Input (text, email, date) ── */
                  return (
                    <div key={c.id} className="ap-field" style={style}>
                      <label className="ap-label" htmlFor={c.id}>
                        {c.label}{c.required && <span style={{ color: '#c0392b' }}> *</span>}
                      </label>
                      <input id={c.id} className={`ap-input${erreur ? ' has-error' : ''}`}
                        type={c.type} placeholder={c.placeholder ?? ''}
                        value={form[c.id] ?? ''} onChange={(e) => setChamp(c.id, e.target.value)} />
                      {erreur && <p className="ap-error">{erreur}</p>}
                    </div>
                  )
                })}
              </div>

              {/* Pièces à fournir - obligatoires en premier */}
              {pieces.length > 0 && (
                <div style={{ background: 'rgba(233,170,32,0.07)', border: '1px solid rgba(233,170,32,0.25)', borderRadius: 10, padding: '14px 18px' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.85rem', color: '#a07010', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} /> Pièces justificatives à apporter
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {pieces.map((p, i) => (
                      <li key={i} style={{ fontSize: '0.84rem', color: 'var(--sg-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.obligatoire !== false && (
                          <span style={{ color: '#c0392b', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>Obligatoire</span>
                        )}
                        {p.libelle}
                        {p.format && <span style={{ fontSize: '0.72rem', color: 'var(--sg-text-muted)', background: 'rgba(0,0,0,0.06)', borderRadius: 4, padding: '1px 5px' }}>{p.format}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Note sécurité */}
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--sg-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                Ce formulaire est protégé par reCAPTCHA Enterprise.
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="submit" className="ae2-btn" style={{ fontSize: '1rem', padding: '12px 36px' }} disabled={envoi}>
                  {envoi ? 'Vérification en cours…' : 'Soumettre ma candidature'}
                </button>
                <button type="button" className="ae2-btn ae2-btn--ghost" onClick={() => navigate(-1)} disabled={envoi}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
