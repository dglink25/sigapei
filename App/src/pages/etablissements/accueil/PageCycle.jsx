import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GraduationCap, CalendarDays, Clock, ArrowLeft, Users } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import { appelsPublicsService } from '../../../services/inscription/appelsPublics.service'
import usePageTitle from '../../../hooks/commun/usePageTitle'

const CYCLE_LABELS = {
  maternelle:    'Maternelle',
  primaire:      'Primaire',
  secondaire:    'Secondaire',
  universitaire: 'Université',
}

function datesFr(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statutAppel(appel) {
  const now   = new Date()
  const debut = appel.date_debut ? new Date(appel.date_debut) : null
  const fin   = appel.date_fin   ? new Date(appel.date_fin)   : null
  const s     = appel.statut

  if (s === 'termine' || s === 'annule') return 'termine'
  if (s === 'ouvert') {
    if (fin && now > fin) return 'termine'
    return 'ouvert'
  }
  if (s === 'brouillon' || s === 'planifie') {
    if (debut && now >= debut) return 'ouvert'
    return 'bientot'
  }
  if (debut && fin && now >= debut && now <= fin) return 'ouvert'
  if (debut && now < debut) return 'bientot'
  return 'termine'
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="pc-appel-card" style={{ gap: 14 }}>
      <div className="ap-skel" style={{ height: 20, width: '40%', borderRadius: 6 }} />
      <div className="ap-skel" style={{ height: 24, width: '85%', borderRadius: 6 }} />
      <div className="ap-skel" style={{ height: 16, width: '70%', borderRadius: 6 }} />
      <div className="ap-skel" style={{ height: 16, width: '55%', borderRadius: 6 }} />
      <div className="ap-skel" style={{ height: 40, width: 140, borderRadius: 8, marginTop: 8 }} />
    </div>
  )
}

export default function PageCycle() {
  const { slug, cycle } = useParams()
  const { data, connecte, lienEspace } = useAccueil()
  const navigate = useNavigate()

  const [appels,  setAppels]  = useState([])
  const [loading, setLoading] = useState(true)

  const cycleLabel = CYCLE_LABELS[cycle] ?? cycle
  usePageTitle(`${cycleLabel} - ${data?.nom ?? ''}`)

  const base = slug ? `/etablissements/${slug}` : ''

  useEffect(() => {
    if (!slug || !cycle) return
    let annule = false
    setLoading(true)
    setAppels([])

    appelsPublicsService.listerTous(null, slug)
      .then((liste) => {
        if (annule) return
        const filtres = (Array.isArray(liste) ? liste : [])
          .filter((a) => a.cycle === cycle && statutAppel(a) !== 'termine')
          .sort((a, b) => {
            const sa = statutAppel(a) === 'ouvert' ? 0 : 1
            const sb = statutAppel(b) === 'ouvert' ? 0 : 1
            return sa - sb
          })
        setAppels(filtres)
      })
      .catch(() => { if (!annule) setAppels([]) })
      .finally(() => { if (!annule) setLoading(false) })

    return () => { annule = true }
  }, [slug, cycle]) // ← uniquement slug et cycle, pas data?.uuid

  return (
    <>
      <AccueilHero
        data={data}
        slug={slug}
        connecte={connecte}
        lienEspace={lienEspace}
        mode="page"
        titre={`Formations - ${cycleLabel}`}
        page="formations"
      />

      <section className="ae2-section" style={{ minHeight: '50vh' }}>
        <div className="ae2-container">

          <button
            type="button"
            className="ae2-btn ae2-btn--ghost"
            style={{ marginBottom: 32 }}
            onClick={() => navigate(`${base}/formations`)}
          >
            <ArrowLeft size={15} /> Retour aux formations
          </button>

          <div className="ae2-section-head">
            <h2 className="ae2-section-titre">
              <span className="ae2-accent">{cycleLabel}</span>
            </h2>
            <p className="ae2-section-sous">Appels à candidature disponibles pour ce cycle</p>
            <div className="ae2-section-barre" />
          </div>

          {/* Skeletons pendant le chargement */}
          {loading ? (
            <div className="pc-appels-grid">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : appels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sg-text-muted)' }}>
              <GraduationCap size={40} style={{ marginBottom: 12 }} />
              <p>Aucune campagne de recrutement en cours pour ce cycle.</p>
            </div>
          ) : (
            <div className="pc-appels-grid">
              {appels.map((appel, i) => {
                const statut   = statutAppel(appel)
                const estOuvert = statut === 'ouvert'
                return (
                  <article key={appel.uuid ?? i} className={`pc-appel-card ${estOuvert ? 'pc-appel-card--ouvert' : 'pc-appel-card--bientot'}`}>
                    <div className={`pc-appel-badge ${estOuvert ? 'pc-appel-badge--ouvert' : 'pc-appel-badge--bientot'}`}>
                      {estOuvert ? '● Ouvert' : '○ Bientôt disponible'}
                    </div>

                    <h3 className="pc-appel-titre">{appel.titre ?? `Appel - ${cycleLabel}`}</h3>

                    {appel.description && (
                      <p className="pc-appel-desc">{appel.description}</p>
                    )}

                    <div className="pc-appel-dates">
                      <div className="pc-appel-date">
                        <CalendarDays size={14} />
                        <span>Ouverture : <strong>{datesFr(appel.date_debut)}</strong></span>
                      </div>
                      {appel.date_fin && (
                        <div className="pc-appel-date">
                          <Clock size={14} />
                          <span>Clôture : <strong>{datesFr(appel.date_fin)}</strong></span>
                        </div>
                      )}
                    </div>

                    {appel.est_payant && appel.montant && Number(appel.montant) > 0 && (
                      <p className="pc-appel-frais">
                        Frais de dossier : <strong>{Number(appel.montant).toLocaleString('fr-FR')} {appel.devise ?? 'FCFA'}</strong>
                      </p>
                    )}

                    {estOuvert ? (
                      <a
                        href={`${base}/candidature?appel=${appel.uuid}`}
                        className="pc-appel-btn pc-appel-btn--candidater"
                      >
                        <Users size={15} /> Candidater
                      </a>
                    ) : (
                      <span className="pc-appel-btn pc-appel-btn--bientot" aria-disabled="true">
                        <Clock size={15} /> Bientôt ouvert - {datesFr(appel.date_debut)}
                      </span>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
