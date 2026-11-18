/**
 * PageCandidature — Formulaire public de candidature.
 * Accessible sans JWT depuis la page publique de l'établissement.
 * URL : /etablissements/:slug/candidature?appel={uuid}
 */
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, Calendar, CheckCircle2 } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import { appelsPublicsService } from '../../../services/inscription/appelsPublics.service'
import { candidaturePubliqueService } from '../../../services/inscription/candidaturePublique.service'
import usePageTitle from '../../../hooks/commun/usePageTitle'

export default function PageCandidature() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { data, connecte, lienEspace } = useAccueil()
  const navigate = useNavigate()

  const appelUuid = searchParams.get('appel')
  const [appel,   setAppel]   = useState(null)
  const [loading, setLoading] = useState(!!appelUuid)
  const [envoi,   setEnvoi]   = useState(false)
  const [succes,  setSucces]  = useState(false)
  const [erreur,  setErreur]  = useState('')

  const base = slug ? `/etablissements/${slug}` : ''

  usePageTitle(`Candidature — ${data?.nom ?? ''}`)

  const [form, setForm] = useState({
    nom: '', prenom: '', date_naissance: '', sexe: '',
    email: '', telephone: '', adresse: '',
    parent_nom: '', parent_prenom: '', parent_telephone: '', parent_email: '', parent_lien: '',
  })

  useEffect(() => {
    if (!appelUuid) return
    appelsPublicsService.afficher(appelUuid)
      .then((a) => setAppel(a))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [appelUuid])

  function set(patch) { setForm((f) => ({ ...f, ...patch })) }

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    try {
      await candidaturePubliqueService.soumettre(slug, {
        ...form,
        appel_uuid: appelUuid ?? undefined,
      })
      setSucces(true)
    } catch (err) {
      setErreur(err?.message ?? 'Une erreur est survenue.')
    } finally {
      setEnvoi(false)
    }
  }

  if (succes) {
    return (
      <>
        <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace} mode="page" titre="Candidature" page="formations" />
        <section className="ae2-section" style={{ minHeight: '50vh' }}>
          <div className="ae2-container" style={{ maxWidth: 600, textAlign: 'center' }}>
            <CheckCircle2 size={56} style={{ color: '#006B3C', marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 12px', color: 'var(--sg-text)' }}>Candidature envoyée !</h2>
            <p style={{ color: 'var(--sg-text-secondary)', marginBottom: 24 }}>
              Votre dossier a été transmis à {data?.nom}. Vous serez contacté(e) pour la suite.
            </p>
            <button type="button" className="ae2-btn" onClick={() => navigate(`${base}/formations`)}>
              Retour aux formations
            </button>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace} mode="page" titre="Candidature" page="formations" />
      <section className="ae2-section" style={{ minHeight: '50vh' }}>
        <div className="ae2-container" style={{ maxWidth: 700 }}>

          <button type="button" className="ae2-btn ae2-btn--ghost" style={{ marginBottom: 24 }} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Retour
          </button>

          {appel && (
            <div style={{ background: 'rgba(0,107,60,0.06)', border: '1px solid rgba(0,107,60,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 28 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#006B3C' }}>{appel.titre}</p>
              {appel.description && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--sg-text-secondary)' }}>{appel.description}</p>}
            </div>
          )}

          <h2 style={{ margin: '0 0 24px', fontSize: '1.4rem', fontWeight: 800 }}>Formulaire de candidature</h2>

          {erreur && (
            <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#c0392b', fontSize: '0.88rem' }}>
              {erreur}
            </div>
          )}

          <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Candidat */}
            <fieldset style={{ border: '1px solid var(--sg-border)', borderRadius: 10, padding: '18px 20px' }}>
              <legend style={{ fontWeight: 700, fontSize: '0.82rem', color: '#006B3C', padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <User size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Informations du candidat
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="ap-field">
                  <label className="ap-label">Nom *</label>
                  <input className="ap-input" value={form.nom} onChange={(e) => set({ nom: e.target.value })} required maxLength={100} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Prénom *</label>
                  <input className="ap-input" value={form.prenom} onChange={(e) => set({ prenom: e.target.value })} required maxLength={100} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Date de naissance *</label>
                  <input className="ap-input" type="date" value={form.date_naissance} onChange={(e) => set({ date_naissance: e.target.value })} required />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Sexe</label>
                  <select className="ap-input" value={form.sexe} onChange={(e) => set({ sexe: e.target.value })}>
                    <option value="">—</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label"><Mail size={12} /> Email</label>
                  <input className="ap-input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} maxLength={150} />
                </div>
                <div className="ap-field">
                  <label className="ap-label"><Phone size={12} /> Téléphone</label>
                  <input className="ap-input" value={form.telephone} onChange={(e) => set({ telephone: e.target.value })} maxLength={50} />
                </div>
                <div className="ap-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="ap-label">Adresse</label>
                  <input className="ap-input" value={form.adresse} onChange={(e) => set({ adresse: e.target.value })} maxLength={255} />
                </div>
              </div>
            </fieldset>

            {/* Parent / Tuteur */}
            <fieldset style={{ border: '1px solid var(--sg-border)', borderRadius: 10, padding: '18px 20px' }}>
              <legend style={{ fontWeight: 700, fontSize: '0.82rem', color: '#006B3C', padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <User size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Parent / Tuteur
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="ap-field">
                  <label className="ap-label">Nom</label>
                  <input className="ap-input" value={form.parent_nom} onChange={(e) => set({ parent_nom: e.target.value })} maxLength={100} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Prénom</label>
                  <input className="ap-input" value={form.parent_prenom} onChange={(e) => set({ parent_prenom: e.target.value })} maxLength={100} />
                </div>
                <div className="ap-field">
                  <label className="ap-label"><Phone size={12} /> Téléphone</label>
                  <input className="ap-input" value={form.parent_telephone} onChange={(e) => set({ parent_telephone: e.target.value })} maxLength={50} />
                </div>
                <div className="ap-field">
                  <label className="ap-label"><Mail size={12} /> Email</label>
                  <input className="ap-input" type="email" value={form.parent_email} onChange={(e) => set({ parent_email: e.target.value })} maxLength={150} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Lien</label>
                  <select className="ap-input" value={form.parent_lien} onChange={(e) => set({ parent_lien: e.target.value })}>
                    <option value="">—</option>
                    <option value="pere">Père</option>
                    <option value="mere">Mère</option>
                    <option value="tuteur">Tuteur légal</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <button type="submit" className="ae2-btn" style={{ alignSelf: 'flex-start', fontSize: '1rem', padding: '12px 32px' }} disabled={envoi}>
              {envoi ? 'Envoi en cours…' : 'Soumettre ma candidature'}
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
