import { useEffect, useRef, useState } from 'react'
import { Users, BookOpen, Calendar, GraduationCap, Microscope, Award, Building2, Clock } from 'lucide-react'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

const STAT_ICONS = {
  users: Users, book: BookOpen, calendar: Calendar,
  graduation: GraduationCap, microscope: Microscope,
  award: Award, building: Building2, clock: Clock,
}
function StatIcon({ nom, size = 28 }) {
  const Ic = STAT_ICONS[nom] ?? Users
  return <Ic size={size} />
}

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

export default function PagePresentation() {
  const { data, slug, connecte, lienEspace } = useAccueil()
  usePageTitle(data?.nom ?? null)

  const stats      = Array.isArray(data.statistiques) ? data.statistiques : []
  const apropos    = data.apropos ?? {}
  const hasApropos = !!(apropos.texte || apropos.mission || apropos.vision)

  const statsRef = useRef(null)
  const [statsVu, setStatsVu] = useState(false)

  useEffect(() => {
    if (!statsRef.current || statsVu) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVu(true) }, { threshold: 0.3 })
    obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [statsVu])

  return (
    <>
      {/* Hero slider complet */}
      <AccueilHero
        data={data}
        slug={slug}
        connecte={connecte}
        lienEspace={lienEspace}
        mode="slider"
        page="presentation"
      />

      {/* Statistiques */}
      {stats.length > 0 && (
        <section className="ae2-section ae2-section--stats" ref={statsRef}>
          <div className="ae2-container">
            <SectionTitre titre="NOS" accent="STATISTIQUES" sous={data.statsDescription ?? ''} />
            <div className="ae2-stats-grid">
              {stats.map((s, i) => <StatCounter key={i} icone={s.icone} valeur={s.valeur} libelle={s.libelle} actif={statsVu} />)}
            </div>
          </div>
        </section>
      )}

      {/* À propos */}
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
    </>
  )
}
