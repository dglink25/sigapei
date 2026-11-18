import { useNavigate } from 'react-router-dom'
import { GraduationCap, School, BookOpen, Building2 } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

const CYCLE_LABELS = {
  maternelle:    'Maternelle',
  primaire:      'Primaire',
  secondaire:    'Secondaire',
  universitaire: 'Université',
}

const CYCLE_ICONS = {
  maternelle:    School,
  primaire:      BookOpen,
  secondaire:    GraduationCap,
  universitaire: Building2,
}

export default function PageFormations() {
  const { data, slug, connecte, lienEspace, cyclesActifs } = useAccueil()
  const navigate = useNavigate()
  usePageTitle(`Formations - ${data?.nom ?? ''}`)

  const base = slug ? `/etablissements/${slug}` : ''

  return (
    <>
      <AccueilHero
        data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
        mode="page" titre="Nos Formations" page="formations"
      />
      <section className="ae2-section ae2-section--alt" style={{ minHeight: '40vh' }}>
        <div className="ae2-container">
          <div className="ae2-section-head">
            <h2 className="ae2-section-titre">NOS OFFRES DE <span className="ae2-accent">FORMATIONS</span></h2>
            <p className="ae2-section-sous">Sélectionnez un cycle pour voir les campagnes de recrutement disponibles.</p>
            <div className="ae2-section-barre" />
          </div>

          {cyclesActifs.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--sg-text-muted)', padding: '2rem 0' }}>
              Aucune formation disponible pour le moment.
            </p>
          ) : (
            <div className="ae2-formations-grid">
              {cyclesActifs.map((cycle) => {
                const Icon = CYCLE_ICONS[cycle] ?? GraduationCap
                return (
                  <article
                    key={cycle}
                    className="ae2-formation-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${base}/formations/${cycle}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`${base}/formations/${cycle}`)}
                  >
                    <div className="ae2-formation-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,107,60,0.06)' }}>
                      <Icon size={56} style={{ color: '#006B3C' }} />
                    </div>
                    <div className="ae2-formation-body">
                      <h3 className="ae2-formation-titre">{CYCLE_LABELS[cycle] ?? cycle}</h3>
                      <p className="ae2-formation-desc">Voir les appels à candidature pour ce cycle</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.82rem', fontWeight: 700, color: '#006B3C' }}>
                        Voir les formations →
                      </span>
                    </div>
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
