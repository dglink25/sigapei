/**
 * PageCycle - Appels à candidature d'un cycle pour l'établissement public.
 * URL : /etablissements/:slug/:cycle  (maternelle | primaire | secondaire | universitaire)
 */
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
  const now = new Date()
  const debut = appel.date_debut ? new Date(appel.date_debut) : null
  const fin   = appel.date_fin   ? new Date(appel.date_fin)   : null

  if (appel.statut === 'ouvert' || appel.statut === 'en_cours') {
    if (fin && now > fin) return 'termine'
    return 'ouvert'
  }
  if (appel.statut === 'brouillon' || appel.statut === 'planifie') {
    return 'bientot'
  }
  if (appel.statut === 'termine' || appel.statut === 'annule') return 'termine'
  // Fallback : comparer les dates
  if (debut && now < debut) return 'bientot'
  if (debut && fin && now >= debut && now <= fin) return 'ouvert'
  return 'termine'
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
    if (!data?.uuid && !slug) return
    setLoading(true)
    // On utilise l'UUID de l'établissement si disponible, sinon on filtre côté front
    appelsPublicsService.listerTous(data?.uuid ?? '')
      .then((liste) => {
        const filtres = liste.filter((a) =>
          a.cycle === cycle && statutAppel(a) !== 'termine'
        )
        // Tri : ouverts en premier, puis bientôt disponibles
        filtres.sort((a, b) => {
          const sa = statutAppel(a) === 'ouvert' ? 0 : 1
          const sb = statutAppel(b) === 'ouvert' ? 0 : 1
          return sa - sb
        })
        setAppels(filtres)
      })
      .catch(() => setAppels([]))
      .finally(() => setLoading(false))
  }, [slug, cycle, data?.uuid])

  return (
    <>
      {/* Hero compact avec image du premier slide hero de l'étab */}
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

          {/* Bouton retour */}
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
            <p className="ae2-section-sous">
              Appels à candidature disponibles pour ce cycle
            </p>
            <div className="ae2-section-barre" />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sg-text-muted)' }}>
              <Clock size={32} style={{ marginBottom: 12 }} />
              <p>Chargement des campagnes…</p>
            </div>
          ) : appels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sg-text-muted)' }}>
              <GraduationCap size={40} style={{ marginBottom: 12 }} />
              <p>Aucune campagne de recrutement en cours pour ce cycle.</p>
            </div>
          ) : (
            <div className="pc-appels-grid">
              {appels.map((appel, i) => {
                const statut = statutAppel(appel)
                const estOuvert = statut === 'ouvert'

                return (
                  <article key={appel.uuid ?? i} className={`pc-appel-card ${estOuvert ? 'pc-appel-card--ouvert' : 'pc-appel-card--bientot'}`}>
                    {/* Badge statut */}
                    <div className={`pc-appel-badge ${estOuvert ? 'pc-appel-badge--ouvert' : 'pc-appel-badge--bientot'}`}>
                      {estOuvert ? '● Ouvert' : '○ Bientôt disponible'}
                    </div>

                    <h3 className="pc-appel-titre">{appel.titre ?? `Appel - ${cycleLabel}`}</h3>

                    {appel.description && (
                      <p className="pc-appel-desc">{appel.description}</p>
                    )}

                    {/* Dates */}
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

                    {/* Frais */}
                    {appel.est_payant && appel.frais_dossier && (
                      <p className="pc-appel-frais">
                        Frais de dossier : <strong>{Number(appel.frais_dossier).toLocaleString('fr-FR')} FCFA</strong>
                      </p>
                    )}

                    {/* CTA */}
                    {estOuvert ? (
                      <a
                        href={`${base}/inscription?appel=${appel.uuid}`}
                        className="pc-appel-btn pc-appel-btn--candidater"
                      >
                        <Users size={15} /> Candidater
                      </a>
                    ) : (
                      <span className="pc-appel-btn pc-appel-btn--bientot" aria-disabled="true">
                        <Clock size={15} /> Bientôt ouvert
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
