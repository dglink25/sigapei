import { Image as ImageIcon } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

function ImgPh({ label = '' }) {
  return <div className="ae2-img-ph" aria-label={label}><ImageIcon size={28} /></div>
}

export default function PageActualites() {
  const { data, slug, connecte, lienEspace } = useAccueil()
  usePageTitle(`Actualités - ${data?.nom ?? ''}`)
  const actualites = Array.isArray(data?.actualites) ? [...data.actualites].sort((a, b) => new Date(b.date) - new Date(a.date)) : []

  const datesFr = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <>
      <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace} mode="page" titre="Actualités" page="actualites" />
      <section className="ae2-section" style={{ minHeight: '40vh' }}>
      <div className="ae2-container">
        <div className="ae2-section-head">
          <h2 className="ae2-section-titre">NOS <span className="ae2-accent">ACTUALITÉS</span></h2>
          <div className="ae2-section-barre" />
        </div>
        {actualites.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--sg-text-muted)' }}>Aucune actualité disponible pour le moment.</p>
        ) : (
          <div className="ae2-actu-grid">
            {actualites.map((a, i) => (
              <article key={i} className="ae2-actu-card">
                <div className="ae2-actu-img">
                  {a.imageUrl ? <img src={a.imageUrl} alt={a.titre} loading="lazy" /> : <ImgPh label={a.titre} />}
                </div>
                <div className="ae2-actu-body">
                  {a.date && <time className="ae2-actu-date" dateTime={a.date}>{datesFr(a.date)}</time>}
                  <h3 className="ae2-actu-titre">{a.titre}</h3>
                  {a.extrait && <p className="ae2-actu-extrait">{a.extrait}</p>}
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
