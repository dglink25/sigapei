/**
 * AccueilHero - Hero réutilisable pour toutes les pages publiques d'un établissement.
 * En mode "page" (pas la présentation), affiche juste une bannière compacte
 * avec le titre de la page, sans slider.
 * En mode "slider" (page Présentation), affiche le carousel complet.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, LogIn, LayoutGrid } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'

export default function AccueilHero({
  data,          // données établissement
  slug,
  connecte,
  lienEspace,
  mode = 'page', // 'slider' | 'page'
  titre,         // titre affiché en mode 'page'
}) {
  const hero = Array.isArray(data?.hero) ? data.hero : []

  /* ── Mode slider (page Présentation) ── */
  const [slide,       setSlide]       = useState(0)
  const [pauseSlider, setPauseSlider] = useState(false)
  const pauseTimer = useRef(null)

  useEffect(() => {
    if (mode !== 'slider' || hero.length < 2 || pauseSlider) return
    const id = setInterval(() => setSlide((s) => (s + 1) % hero.length), 3000)
    return () => clearInterval(id)
  }, [mode, hero, pauseSlider])

  function navSlide(dir) {
    setSlide((s) => (s + dir + hero.length) % hero.length)
    setPauseSlider(true)
    clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(() => setPauseSlider(false), 8000)
  }

  /* ══════════════
     MODE SLIDER
  ══════════════ */
  if (mode === 'slider') {
    if (hero.length > 0) {
      return (
        <section className="ae2-hero" aria-label="Présentation">
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
          <div className="ae2-hero-content">
            <h1 className="ae2-hero-titre">{hero[slide]?.titre}</h1>
            {hero[slide]?.sousTitre && <p className="ae2-hero-sous">{hero[slide].sousTitre}</p>}
            {hero[slide]?.ctaLibelle && (
              <a href={hero[slide].ctaUrl ?? '#'} className="ae2-btn ae2-btn--hero">
                {hero[slide].ctaLibelle} <ArrowRight size={15} />
              </a>
            )}
          </div>
          {hero.length > 1 && (
            <>
              <button type="button" className="ae2-hero-arr ae2-hero-arr--prev" onClick={() => navSlide(-1)} aria-label="Slide précédent"><ChevronLeft size={26} /></button>
              <button type="button" className="ae2-hero-arr ae2-hero-arr--next" onClick={() => navSlide(1)} aria-label="Slide suivant"><ChevronRight size={26} /></button>
              <div className="ae2-hero-dots" role="tablist">
                {hero.map((_, i) => (
                  <button key={i} role="tab" type="button" aria-selected={i === slide} aria-label={`Slide ${i + 1}`}
                    className={`ae2-hero-dot${i === slide ? ' is-active' : ''}`}
                    onClick={() => { setSlide(i); setPauseSlider(true); clearTimeout(pauseTimer.current); pauseTimer.current = setTimeout(() => setPauseSlider(false), 8000) }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )
    }
    /* Pas de slides : hero statique */
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

  /* ══════════════
     MODE PAGE - bannière compacte avec dernière image du slider en fond
  ══════════════ */
  const bgImage = hero[0]?.imageUrl ?? null

  return (
    <section
      className="ae2-hero ae2-hero--compact"
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
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
