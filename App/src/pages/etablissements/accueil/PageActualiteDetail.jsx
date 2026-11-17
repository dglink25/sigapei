import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Image as ImageIcon } from 'lucide-react'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

export default function PageActualiteDetail() {
  const { index } = useParams()
  const { data, slug } = useAccueil()
  const navigate = useNavigate()

  const actualites = Array.isArray(data?.actualites) ? data.actualites : []
  const idx = parseInt(index, 10)
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

  return (
    <>
      {/* ══ HERO - image de l'actualité plein écran ══ */}
      <section
        className="ae2-hero ae2-hero--compact"
        style={actu.imageUrl ? { backgroundImage: `url(${actu.imageUrl})` } : {}}
        aria-label={actu.titre}
      >
        <div className="ae2-hero-overlay" />
        <div className="ae2-hero-content">
          {actu.date && (
            <p className="ae2-hero-sous" style={{ marginBottom: 8, opacity: 0.75 }}>
              <Calendar size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              {datesFr(actu.date)}
            </p>
          )}
          <h1 className="ae2-hero-titre">{actu.titre}</h1>
          {actu.extrait && <p className="ae2-hero-sous">{actu.extrait}</p>}
        </div>
      </section>

      {/* ══ CONTENU ══ */}
      <section className="ae2-section" style={{ minHeight: '40vh' }}>
        <div className="ae2-container" style={{ maxWidth: 820 }}>

          {/* Bouton retour */}
          <button
            type="button"
            className="ae2-btn ae2-btn--ghost"
            style={{ marginBottom: 32 }}
            onClick={() => navigate(`${base}/actualites`)}
          >
            <ArrowLeft size={15} /> Retour aux actualités
          </button>

          {/* Meta */}
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

          {/* Corps complet si disponible */}
          {actu.corps && (
            <div
              className="ae2-actu-corps"
              style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--sg-text)' }}
              dangerouslySetInnerHTML={{ __html: actu.corps }}
            />
          )}

          {/* Image agrandie si pas de hero */}
          {actu.imageUrl && !actu.corps && (
            <img
              src={actu.imageUrl}
              alt={actu.titre}
              style={{ width: '100%', borderRadius: 12, marginTop: 16 }}
              loading="lazy"
            />
          )}
        </div>
      </section>
    </>
  )
}
