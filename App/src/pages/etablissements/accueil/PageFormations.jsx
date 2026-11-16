import { Clock, Image as ImageIcon, ArrowRight } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

function ImgPh({ label = '' }) {
  return <div className="ae2-img-ph" aria-label={label}><ImageIcon size={28} /></div>
}

export default function PageFormations() {
  const { data, slug, connecte, lienEspace } = useAccueil()
  usePageTitle(`Formations - ${data?.nom ?? ''}`)
  const formations = Array.isArray(data?.formations) ? data.formations : []

  return (
    <>
      <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace} mode="page" titre="Nos Formations" page="formations" />
      <section className="ae2-section ae2-section--alt" style={{ minHeight: '40vh' }}>
      <div className="ae2-container">
        <div className="ae2-section-head">
          <h2 className="ae2-section-titre">NOS OFFRES DE <span className="ae2-accent">FORMATIONS</span></h2>
          <p className="ae2-section-sous">Découvrez les programmes proposés par notre établissement.</p>
          <div className="ae2-section-barre" />
        </div>
        {formations.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--sg-text-muted)' }}>Aucune formation disponible pour le moment.</p>
        ) : (
          <div className="ae2-formations-grid">
            {formations.map((f, i) => (
              <article key={i} className="ae2-formation-card">
                <div className="ae2-formation-img">
                  {f.imageUrl ? <img src={f.imageUrl} alt={f.titre} loading="lazy" /> : <ImgPh label={f.titre} />}
                  {f.niveau && <span className="ae2-formation-badge">{f.niveau}</span>}
                </div>
                <div className="ae2-formation-body">
                  {f.duree && <p className="ae2-formation-duree"><Clock size={12} /> {f.duree}</p>}
                  <h3 className="ae2-formation-titre">{f.titre}</h3>
                  {f.description && <p className="ae2-formation-desc">{f.description}</p>}
                  {f.lienUrl && <a href={f.lienUrl} className="ae2-formation-lien">Découvrir <ArrowRight size={13} /></a>}
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
