import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Image as ImageIcon } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import PageBanner from '../../../components/etablissements/PageBanner'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

export default function PageActualiteDetail() {
  const { index } = useParams()
  const { data, slug, connecte, lienEspace } = useAccueil()
  const navigate = useNavigate()

  const actualites = Array.isArray(data?.actualites) ? data.actualites : []
  const idx  = parseInt(index, 10)
  const actu = actualites[idx] ?? null

  usePageTitle(actu ? `${actu.titre} - ${data?.nom ?? ''}` : 'Actualité')

  const datesFr = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const base = slug ? `/etablissements/${slug}` : ''

  if (!actu) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '48px 24px' }}>
        <ImageIcon size={48} style={{ color: 'var(--sg-text-muted)' }} />
        <h2 style={{ margin: 0 }}>Actualité introuvable</h2>
        <button type="button" className="ae2-btn ae2-btn--ghost" onClick={() => navigate(`${base}/actualites`)}>
          <ArrowLeft size={15} /> Retour aux actualités
        </button>
      </div>
    )
  }

  const titreCoupe = actu.titre.length > 40 ? actu.titre.slice(0, 40) + '…' : actu.titre

  return (
    <>
      <AccueilHero
        data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
        mode="page" titre={actu.titre} page="actualites"
      />
      <PageBanner
        titre={titreCoupe}
        fil={[
          { label: data?.nom ?? 'Accueil', href: base || '/' },
          { label: 'Actualités', href: `${base}/actualites` },
          { label: titreCoupe },
        ]}
        retour={`${base}/actualites`}
      />

      <section className="ae2-section" style={{ minHeight: '40vh' }}>
        <div className="ae2-container" style={{ maxWidth: 820 }}>

          {/* Image de couverture si disponible */}
          {actu.imageUrl && (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 32, maxHeight: 360 }}>
              <img src={actu.imageUrl} alt={actu.titre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            </div>
          )}

          {/* Meta date */}
          {actu.date && (
            <p style={{ color: '#E9AA20', fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} />
              <time dateTime={actu.date}>{datesFr(actu.date)}</time>
            </p>
          )}

          <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: 'var(--sg-text)', lineHeight: 1.25 }}>
            {actu.titre}
          </h1>

          {actu.extrait && (
            <p style={{ fontSize: '1.08rem', color: 'var(--sg-text-secondary)', lineHeight: 1.7, margin: '0 0 28px', borderLeft: '4px solid #006B3C', paddingLeft: 16 }}>
              {actu.extrait}
            </p>
          )}

          {actu.corps && (
            <div
              className="ae2-actu-corps"
              style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--sg-text)' }}
              dangerouslySetInnerHTML={{ __html: actu.corps }}
            />
          )}
        </div>
      </section>
    </>
  )
}
