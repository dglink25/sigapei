import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

export default function PageGalerie() {
  const { data, slug, connecte, lienEspace } = useAccueil()
  usePageTitle(`Galerie - ${data?.nom ?? ''}`)
  const galerie = Array.isArray(data?.galerie) ? data.galerie : []
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!lightbox) return
    const fn = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [lightbox])

  return (
    <>
      <AccueilHero data={data} slug={slug} connecte={connecte} lienEspace={lienEspace} mode="page" titre="Galerie" page="galerie" />
      <section className="ae2-section ae2-section--alt" style={{ minHeight: '40vh' }}>
      <div className="ae2-container">
        <div className="ae2-section-head">
          <h2 className="ae2-section-titre">NOTRE <span className="ae2-accent">GALERIE</span></h2>
          <div className="ae2-section-barre" />
        </div>
        {galerie.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--sg-text-muted)' }}>Aucune photo disponible pour le moment.</p>
        ) : (
          <div className="ae2-galerie-grid">
            {galerie.map((url, i) => (
              <button key={i} type="button" className="ae2-galerie-item" onClick={() => setLightbox(url)} aria-label={`Photo ${i + 1}`}>
                <img src={url} alt={`${data.nom} - photo ${i + 1}`} loading="lazy" />
                <div className="ae2-galerie-overlay" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="ae2-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button type="button" className="ae2-lightbox-close" onClick={() => setLightbox(null)} aria-label="Fermer"><X size={22} /></button>
          <img src={lightbox} alt="Photo agrandie" className="ae2-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
    </>
  )
}
