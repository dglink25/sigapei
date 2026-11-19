import { useNavigate } from 'react-router-dom'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import CycleIllustration from '../../../components/etablissements/CycleIllustration'
import PageBanner from '../../../components/etablissements/PageBanner'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

const CYCLE_LABELS = {
  maternelle:    'Maternelle',
  primaire:      'Primaire',
  secondaire:    'Secondaire',
  universitaire: 'Université',
}

function SkeletonCard() {
  return (
    <div className="ae2-formation-card" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <div className="ae2-formation-img" style={{ height: 190, background: 'var(--sg-border, #eee)', borderRadius: 8 }}>
        <div className="ap-skel" style={{ width: 120, height: 120, borderRadius: 16, margin: 'auto' }} />
      </div>
      <div className="ae2-formation-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="ap-skel" style={{ height: 20, width: '55%', borderRadius: 6 }} />
        <div className="ap-skel" style={{ height: 14, width: '80%', borderRadius: 5 }} />
        <div className="ap-skel" style={{ height: 14, width: '40%', borderRadius: 5 }} />
      </div>
    </div>
  )
}

export default function PageFormations() {
  const { data, slug, connecte, lienEspace, cyclesActifs, cyclesLoading } = useAccueil()
  const navigate = useNavigate()
  usePageTitle(`Formations - ${data?.nom ?? ''}`)

  const base = slug ? `/etablissements/${slug}` : ''

  return (
    <>
      <AccueilHero
        data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
        mode="page" titre="Nos Formations" page="formations"
      />
      <PageBanner
        titre="Nos Formations"
        fil={[
          { label: data?.nom ?? 'Accueil', href: base || '/' },
          { label: 'Formations' },
        ]}
      />

      <section className="ae2-section ae2-section--alt" style={{ minHeight: '40vh' }}>
        <div className="ae2-container">
          <div className="ae2-section-head">
            <h2 className="ae2-section-titre">NOS OFFRES DE <span className="ae2-accent">FORMATIONS</span></h2>
            <p className="ae2-section-sous">Sélectionnez un cycle pour voir les campagnes de recrutement disponibles.</p>
            <div className="ae2-section-barre" />
          </div>

          {cyclesLoading ? (
            <div className="ae2-formations-grid">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : cyclesActifs.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--sg-text-muted)', padding: '2rem 0' }}>
              Aucune formation disponible pour le moment.
            </p>
          ) : (
            <div className="ae2-formations-grid">
              {cyclesActifs.map((cycle) => (
                <article
                  key={cycle}
                  className="ae2-formation-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`${base}/formations/${cycle}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`${base}/formations/${cycle}`)}
                >
                  <div className="ae2-formation-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,107,60,0.04)', height: 190 }}>
                    <CycleIllustration cycle={cycle} size={120} />
                  </div>
                  <div className="ae2-formation-body">
                    <h3 className="ae2-formation-titre">{CYCLE_LABELS[cycle] ?? cycle}</h3>
                    <p className="ae2-formation-desc">Voir les appels à candidature pour ce cycle</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.82rem', fontWeight: 700, color: '#006B3C' }}>
                      Voir les formations →
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
