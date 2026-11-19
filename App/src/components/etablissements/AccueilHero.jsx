/**
 * AccueilHero - Hero réutilisable pour toutes les pages publiques d'un établissement.
 *
 * Comportement unifié :
 *   - mode "slider" (page Présentation) : carousel plein écran
 *   - mode "page"   (autres pages)      : carousel compact — MÊME logique de défilement,
 *     mais hauteur réduite et titre de page affiché en overlay.
 *     Si un seul slide → fond statique. Si plusieurs → défilement automatique + flèches + dots.
 *
 * Filtrage des slides : un slide s'affiche sur une page si sa config "pages" contient
 * l'identifiant de la page courante OU contient 'toutes'.
 * Exemple : slide configuré ["toutes"] + slide configuré ["formations"]
 *   → sur la page formations, les DEUX slides s'affichent et défilent.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, LogIn, LayoutGrid } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'

/* ── Hook carousel partagé ── */
function useCarousel(count, actif = true) {
  const [slide,   setSlide]   = useState(0)
  const [paused,  setPaused]  = useState(false)
  const pauseTimer = useRef(null)

  useEffect(() => {
    if (!actif || count < 2 || paused) return
    const id = setInterval(() => setSlide((s) => (s + 1) % count), 3000)
    return () => clearInterval(id)
  }, [actif, count, paused])

  function aller(dir) {
    setSlide((s) => (s + dir + count) % count)
    setPaused(true)
    clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(() => setPaused(false), 8000)
  }

  function allerVers(i) {
    setSlide(i)
    setPaused(true)
    clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(() => setPaused(false), 8000)
  }

  return { slide, aller, allerVers }
}

export default function AccueilHero({
  data,
  slug,
  connecte,
  lienEspace,
  mode  = 'page',
  titre,
  page  = 'presentation',
}) {
  const allHero = Array.isArray(data?.hero) ? data.hero : []

  /* Slides applicables à cette page */
  const hero = allHero.filter((s) => {
    const pages = Array.isArray(s.pages) && s.pages.length > 0 ? s.pages : ['toutes']
    return pages.includes('toutes') || pages.includes(page)
  })

  const isSliderMode = mode === 'slider'
  const { slide, aller, allerVers } = useCarousel(hero.length, hero.length > 1)

  /* ══════════════════════════════════════════
     MODE SLIDER — plein écran (Présentation)
  ══════════════════════════════════════════ */
  if (isSliderMode) {
    if (hero.length === 0) {
      return (
        <section className="ae2-hero ae2-hero-static" aria-label="Présentation">
          <div className="ae2-hero-overlay" />
          <div className="ae2-hero-content">
            <h1 className="ae2-hero-titre">Bienvenue à <strong>{data?.nom}</strong></h1>
            <p className="ae2-hero-sous">Propulsé par {ENV.appName}</p>
            {connecte
              ? <a href={lienEspace} className="ae2-btn ae2-btn--hero"><LayoutGrid size={14} /> Mon espace</a>
              : <LienConnexion slug={slug} className="ae2-btn ae2-btn--hero"><LogIn size={14} /> Se connecter</LienConnexion>
            }
          </div>
        </section>
      )
    }

    return (
      <section className="ae2-hero" aria-label="Présentation">
        {/* Slides fond */}
        {hero.map((s, i) => (
          <div
            key={i}
            className={`ae2-hero-slide${i === slide ? ' is-active' : ''}`}
            style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : {}}
            aria-hidden={i !== slide}
          >
            <div className="ae2-hero-overlay" />
          </div>
        ))}

        {/* Contenu */}
        <div className="ae2-hero-content">
          <h1 className="ae2-hero-titre">{hero[slide]?.titre}</h1>
          {hero[slide]?.sousTitre && (
            <p className="ae2-hero-sous">{hero[slide].sousTitre}</p>
          )}
          {hero[slide]?.ctaLibelle && (
            <a href={hero[slide].ctaUrl ?? '#'} className="ae2-btn ae2-btn--hero">
              {hero[slide].ctaLibelle} <ArrowRight size={15} />
            </a>
          )}
        </div>

        {/* Navigation (uniquement si > 1 slide) */}
        {hero.length > 1 && (
          <>
            <button type="button" className="ae2-hero-arr ae2-hero-arr--prev" onClick={() => aller(-1)} aria-label="Slide précédent">
              <ChevronLeft size={26} />
            </button>
            <button type="button" className="ae2-hero-arr ae2-hero-arr--next" onClick={() => aller(1)} aria-label="Slide suivant">
              <ChevronRight size={26} />
            </button>
            <div className="ae2-hero-dots" role="tablist">
              {hero.map((_, i) => (
                <button
                  key={i} role="tab" type="button"
                  aria-selected={i === slide}
                  aria-label={`Slide ${i + 1}`}
                  className={`ae2-hero-dot${i === slide ? ' is-active' : ''}`}
                  onClick={() => allerVers(i)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    )
  }

  /* ══════════════════════════════════════════
     MODE PAGE — bannière compacte
     Même carousel que slider, hauteur réduite.
     Le titre de la page est affiché en overlay.
  ══════════════════════════════════════════ */

  /* Aucun slide configuré pour cette page → fond uni */
  if (hero.length === 0) {
    return (
      <section className="ae2-hero ae2-hero--compact" aria-label={titre}>
        <div className="ae2-hero-overlay" />
        <div className="ae2-hero-content">
          <h1 className="ae2-hero-titre">{titre}</h1>
          <p className="ae2-hero-sous">{data?.nom}</p>
        </div>
      </section>
    )
  }

  /* Un seul slide → fond statique */
  if (hero.length === 1) {
    return (
      <section
        className="ae2-hero ae2-hero--compact"
        style={hero[0].imageUrl ? { backgroundImage: `url(${hero[0].imageUrl})` } : {}}
        aria-label={titre}
      >
        <div className="ae2-hero-overlay" />
        <div className="ae2-hero-content">
          <h1 className="ae2-hero-titre">{titre}</h1>
          <p className="ae2-hero-sous">{data?.nom}</p>
        </div>
      </section>
    )
  }

  /* Plusieurs slides → carousel compact avec défilement automatique */
  return (
    <section className="ae2-hero ae2-hero--compact" aria-label={titre}>
      {/* Slides fond */}
      {hero.map((s, i) => (
        <div
          key={i}
          className={`ae2-hero-slide${i === slide ? ' is-active' : ''}`}
          style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : {}}
          aria-hidden={i !== slide}
        >
          <div className="ae2-hero-overlay" />
        </div>
      ))}

      {/* Titre de la page toujours visible */}
      <div className="ae2-hero-content">
        <h1 className="ae2-hero-titre">{titre}</h1>
        <p className="ae2-hero-sous">{data?.nom}</p>
      </div>

      {/* Flèches */}
      <button type="button" className="ae2-hero-arr ae2-hero-arr--prev" onClick={() => aller(-1)} aria-label="Slide précédent">
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="ae2-hero-arr ae2-hero-arr--next" onClick={() => aller(1)} aria-label="Slide suivant">
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="ae2-hero-dots" role="tablist">
        {hero.map((_, i) => (
          <button
            key={i} role="tab" type="button"
            aria-selected={i === slide}
            aria-label={`Slide ${i + 1}`}
            className={`ae2-hero-dot${i === slide ? ' is-active' : ''}`}
            onClick={() => allerVers(i)}
          />
        ))}
      </div>
    </section>
  )
}
