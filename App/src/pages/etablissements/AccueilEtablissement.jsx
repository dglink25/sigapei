import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Building2, LogIn, LayoutGrid, ChevronLeft, ChevronRight, X,
  MapPin, Mail, Phone,
  Users, BookOpen, Calendar, GraduationCap, Microscope, Award, Clock,
  Image as ImageIcon, ArrowRight,
} from 'lucide-react'
import { accueilPublicService } from '../../services/etablissements/accueilPublic.service'
import { detecterSlugEtablissement, urlPlateforme, lienEtablissement } from '../../lib/etablissements/subdomain'
import { tokenStore } from '../../lib/identite/tokenStore'
import LienConnexion from '../../components/etablissements/LienConnexion'
import AccueilHeader from '../../components/etablissements/AccueilHeader'
import AccueilFooter from '../../components/etablissements/AccueilFooter'
import { ENV } from '../../config/commun/env'
import Loader from '../../components/commun/Loader'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './AccueilEtablissement.css'

/* ── Icônes de stats ── */
const STAT_ICONS = {
  users: Users, book: BookOpen, calendar: Calendar,
  graduation: GraduationCap, microscope: Microscope,
  award: Award, building: Building2, clock: Clock,
}
function StatIcon({ nom, size = 28 }) {
  const Ic = STAT_ICONS[nom] ?? Users
  return <Ic size={size} />
}

/* ── Count-up déclenché au scroll ── */
function useCountUp(valeur, actif, duree = 2000) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!actif) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / duree, 1)
      setN(Math.floor(pct * valeur))
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [actif, valeur, duree])
  return n
}

function StatCounter({ icone, valeur, libelle, actif }) {
  const n = useCountUp(valeur, actif)
  const fmt = (v) => v >= 1000 ? v.toLocaleString('fr-FR') : String(v)
  return (
    <div className="ae2-stat-card">
      <div className="ae2-stat-icon"><StatIcon nom={icone} /></div>
      <div className="ae2-stat-val">{fmt(n)}{valeur > 0 && '+'}</div>
      <div className="ae2-stat-lbl">{libelle}</div>
    </div>
  )
}

function SectionTitre({ titre, accent, sous }) {
  return (
    <div className="ae2-section-head">
      <h2 className="ae2-section-titre">{titre} {accent && <span className="ae2-accent">{accent}</span>}</h2>
      {sous && <p className="ae2-section-sous">{sous}</p>}
      <div className="ae2-section-barre" />
    </div>
  )
}

function ImgPlaceholder({ label = '' }) {
  return <div className="ae2-img-ph" aria-label={label}><ImageIcon size={28} /></div>
}

/* ══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════ */
export default function AccueilEtablissement() {
  const { slug: slugParam } = useParams()
  const slug = slugParam ?? detecterSlugEtablissement()

  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [erreur,   setErreur]   = useState(null)
  const [connecte, setConnecte] = useState(false)

  /* Slider */
  const [slide,       setSlide]       = useState(0)
  const [pauseSlider, setPauseSlider] = useState(false)
  const pauseTimer = useRef(null)

  /* Stats count-up */
  const statsRef = useRef(null)
  const [statsVu, setStatsVu] = useState(false)

  /* Lightbox */
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => { setConnecte(!!tokenStore.getAccess()) }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    accueilPublicService.lire(slug)
      .then(setData)
      .catch(() => setErreur('Établissement introuvable ou indisponible.'))
      .finally(() => setLoading(false))
  }, [slug])

  /* Auto-slide */
  useEffect(() => {
    if (!data?.hero?.length || data.hero.length < 2 || pauseSlider) return
    const id = setInterval(() => setSlide((s) => (s + 1) % data.hero.length), 3000)
    return () => clearInterval(id)
  }, [data, pauseSlider])

  /* IntersectionObserver stats */
  useEffect(() => {
    if (!statsRef.current || statsVu) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVu(true) }, { threshold: 0.3 })
    obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [data, statsVu])

  /* Lightbox clavier */
  useEffect(() => {
    if (!lightbox) return
    const fn = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [lightbox])

  const lienEspace = lienEtablissement(slug, '/portail')

  /* ── Titre de l'onglet dynamique ── */
  usePageTitle(data?.nom ?? null)

  function navSlide(dir) {
    if (!data?.hero?.length) return
    setSlide((s) => (s + dir + data.hero.length) % data.hero.length)
    setPauseSlider(true)
    clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(() => setPauseSlider(false), 8000)
  }

  function scrollVers(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  /* ── Chargement ── */
  if (loading) return <Loader label="Chargement…" />

  /* ── Erreur ── */
  if (erreur || !data) {
    return (
      <div className="ae2-error">
        <div className="ae2-error-card">
          <img src="/sigapei.png" alt={ENV.appName} className="ae2-error-logo" />
          <Building2 size={44} className="ae2-error-icon" />
          <h1>Établissement introuvable</h1>
          <p>{erreur ?? "Cet établissement n'existe pas ou n'est plus actif."}</p>
          <a href={urlPlateforme('/')} className="ae2-btn">Retour à SIGAPEI</a>
        </div>
      </div>
    )
  }

  /* ── Dégradé / suspendu ── */
  if (data.degrade) {
    return (
      <div className="ae2-error">
        <div className="ae2-error-card">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.nom ?? ''} className="ae2-error-logo" />
            : <img src="/sigapei.png" alt={ENV.appName} className="ae2-error-logo" />
          }
          <Building2 size={44} className="ae2-error-icon ae2-error-icon--warn" />
          <h1>{data.nom ?? 'Établissement'}</h1>
          <p>{data.message ?? "Cet établissement n'est pas accessible pour le moment."}</p>
          <a href={urlPlateforme('/')} className="ae2-btn ae2-btn--ghost">Retour à SIGAPEI</a>
        </div>
      </div>
    )
  }

  /* ── Données ── */
  const hero       = Array.isArray(data.hero)         ? data.hero         : []
  const stats      = Array.isArray(data.statistiques)  ? data.statistiques  : []
  const formations = Array.isArray(data.formations)   ? data.formations   : []
  const galerie    = Array.isArray(data.galerie)      ? data.galerie      : []
  const actualites = Array.isArray(data.actualites)   ? data.actualites   : []
  const apropos    = data.apropos ?? {}
  const hasApropos = !!(apropos.texte || apropos.mission || apropos.vision)

  const NAV = [
    { id: 'ae2-presentation', label: 'Présentation' },
    ...(formations.length  ? [{ id: 'ae2-formations', label: 'Formations' }] : []),
    ...(actualites.length  ? [{ id: 'ae2-actualites', label: 'Actualités' }] : []),
    ...(galerie.length     ? [{ id: 'ae2-galerie',    label: 'Galerie'    }] : []),
    { id: 'ae2-contact', label: 'Contact' },
  ]

  const datesFr = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  /* ══════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════ */
  return (
    <div className="ae2-page">

      {/* ── Header (fichier séparé) ── */}
      <AccueilHeader
        data={data}
        slug={slug}
        connecte={connecte}
        lienEspace={lienEspace}
        navItems={NAV}
        onScrollTo={scrollVers}
      />

      <main>

        {/* ══ HERO SLIDER ══════════════════════════════════ */}
        <section id="ae2-presentation" className="ae2-hero" aria-label="Présentation">
          {hero.length > 0 ? (
            <>
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
                  <button type="button" className="ae2-hero-arr ae2-hero-arr--next" onClick={() => navSlide(1)}  aria-label="Slide suivant"><ChevronRight size={26} /></button>
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
            </>
          ) : (
            <div className="ae2-hero-static">
              <div className="ae2-hero-overlay" />
              <div className="ae2-hero-content">
                <h1 className="ae2-hero-titre">Bienvenue à <strong>{data.nom}</strong></h1>
                <p className="ae2-hero-sous">Propulsé par {ENV.appName} - Système Intégré de Gestion et d'Administration des Établissements Privés d'Enseignement</p>
                {connecte
                  ? <a href={lienEspace} className="ae2-btn ae2-btn--hero"><LayoutGrid size={14} /> Mon espace</a>
                  : <LienConnexion slug={slug} className="ae2-btn ae2-btn--hero"><LogIn size={14} /> Se connecter</LienConnexion>
                }
              </div>
            </div>
          )}
        </section>

        {/* ══ STATISTIQUES ═════════════════════════════════ */}
        {stats.length > 0 && (
          <section className="ae2-section ae2-section--stats" ref={statsRef}>
            <div className="ae2-container">
              <SectionTitre titre="NOS" accent="STATISTIQUES" sous={data.statsDescription ?? ''} />
              <div className="ae2-stats-grid">
                {stats.map((s, i) => <StatCounter key={i} icone={s.icone} valeur={s.valeur} libelle={s.libelle} actif={statsVu} />)}
              </div>
              {data.statsNote && <p className="ae2-stats-note">ⓘ {data.statsNote}</p>}
            </div>
          </section>
        )}

        {/* ══ FORMATIONS ═══════════════════════════════════ */}
        {formations.length > 0 && (
          <section id="ae2-formations" className="ae2-section ae2-section--alt">
            <div className="ae2-container">
              <SectionTitre titre="NOS OFFRES DE" accent="FORMATIONS" sous="Découvrez les programmes proposés par notre établissement." />
              <div className="ae2-formations-grid">
                {formations.map((f, i) => (
                  <article key={i} className="ae2-formation-card">
                    <div className="ae2-formation-img">
                      {f.imageUrl ? <img src={f.imageUrl} alt={f.titre} loading="lazy" /> : <ImgPlaceholder label={f.titre} />}
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
            </div>
          </section>
        )}

        {/* ══ À PROPOS ══════════════════════════════════════ */}
        {hasApropos && (
          <section className="ae2-section ae2-section--apropos">
            <div className="ae2-container">
              <SectionTitre titre="À PROPOS DE" accent="NOUS" />
              <div className="ae2-apropos-grid">
                {apropos.texte   && <div className="ae2-apropos-bloc ae2-apropos-bloc--main"><p>{apropos.texte}</p></div>}
                {apropos.mission && <div className="ae2-apropos-bloc"><h4 className="ae2-apropos-label">Notre Mission</h4><p>{apropos.mission}</p></div>}
                {apropos.vision  && <div className="ae2-apropos-bloc"><h4 className="ae2-apropos-label">Notre Vision</h4><p>{apropos.vision}</p></div>}
              </div>
            </div>
          </section>
        )}

        {/* ══ GALERIE ═══════════════════════════════════════ */}
        {galerie.length > 0 && (
          <section id="ae2-galerie" className="ae2-section ae2-section--alt">
            <div className="ae2-container">
              <SectionTitre titre="NOTRE" accent="GALERIE" />
              <div className="ae2-galerie-grid">
                {galerie.map((url, i) => (
                  <button key={i} type="button" className="ae2-galerie-item" onClick={() => setLightbox(url)} aria-label={`Photo ${i + 1}`}>
                    <img src={url} alt={`${data.nom} - photo ${i + 1}`} loading="lazy" />
                    <div className="ae2-galerie-overlay" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══ ACTUALITÉS ════════════════════════════════════ */}
        {actualites.length > 0 && (
          <section id="ae2-actualites" className="ae2-section">
            <div className="ae2-container">
              <SectionTitre titre="NOS" accent="ACTUALITÉS" />
              <div className="ae2-actu-grid">
                {[...actualites].sort((a, b) => new Date(b.date) - new Date(a.date)).map((a, i) => (
                  <article key={i} className="ae2-actu-card">
                    <div className="ae2-actu-img">
                      {a.imageUrl ? <img src={a.imageUrl} alt={a.titre} loading="lazy" /> : <ImgPlaceholder label={a.titre} />}
                    </div>
                    <div className="ae2-actu-body">
                      {a.date && <time className="ae2-actu-date" dateTime={a.date}>{datesFr(a.date)}</time>}
                      <h3 className="ae2-actu-titre">{a.titre}</h3>
                      {a.extrait && <p className="ae2-actu-extrait">{a.extrait}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══ CONTACT ═══════════════════════════════════════ */}
        <section id="ae2-contact" className="ae2-section ae2-section--contact">
          <div className="ae2-container">
            <SectionTitre titre="NOUS" accent="CONTACTER" />
            <div className="ae2-contact-grid">
              {data.adresseComplete && (
                <div className="ae2-contact-item">
                  <MapPin size={20} className="ae2-contact-icon" />
                  <div><p className="ae2-contact-label">Adresse</p><p className="ae2-contact-val">{data.adresseComplete}</p></div>
                </div>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className="ae2-contact-item ae2-contact-item--link">
                  <Mail size={20} className="ae2-contact-icon" />
                  <div><p className="ae2-contact-label">Email</p><p className="ae2-contact-val">{data.email}</p></div>
                </a>
              )}
              {data.telephone1 && (
                <a href={`tel:${data.telephone1}`} className="ae2-contact-item ae2-contact-item--link">
                  <Phone size={20} className="ae2-contact-icon" />
                  <div><p className="ae2-contact-label">Téléphone</p><p className="ae2-contact-val">{data.telephone1}</p></div>
                </a>
              )}
            </div>
            <div className="ae2-cta-box">
              <BookOpen size={26} className="ae2-cta-icon" />
              <div>
                <h3>Accédez à votre espace</h3>
                <p>Élèves, enseignants, parents et administration - connectez-vous pour accéder aux services.</p>
              </div>
              {connecte
                ? <a href={lienEspace} className="ae2-btn ae2-btn--gold"><LayoutGrid size={14} /> Mon espace</a>
                : <LienConnexion slug={slug} className="ae2-btn ae2-btn--gold"><LogIn size={14} /> Se connecter</LienConnexion>
              }
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer (fichier séparé) ── */}
      <AccueilFooter data={data} navItems={NAV} onScrollTo={scrollVers} />

      {/* ══ LIGHTBOX ══════════════════════════════════════ */}
      {lightbox && (
        <div className="ae2-lightbox" role="dialog" aria-modal="true" aria-label="Photo agrandie" onClick={() => setLightbox(null)}>
          <button type="button" className="ae2-lightbox-close" onClick={() => setLightbox(null)} aria-label="Fermer"><X size={22} /></button>
          <img src={lightbox} alt="Photo agrandie" className="ae2-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

    </div>
  )
}
