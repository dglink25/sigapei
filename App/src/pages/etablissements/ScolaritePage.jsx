import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  GraduationCap, CalendarDays, School, BookOpen, Building2, ChevronRight,
  CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react'

import { lienEtablissement }            from '../../lib/etablissements/subdomain'
import { portailService }               from '../../services/identite/portail.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import { monEtablissementService }      from '../../services/etablissements/monEtablissement.service'
import useSlugEtablissement             from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle                     from '../../hooks/commun/usePageTitle'

import ModuleLayout     from '../../components/commun/ModuleLayout'
import Loader           from '../../components/commun/Loader'
import PanneauAnnees    from '../../components/etablissements/config/PanneauAnnees'
import PanneauCycles    from '../../components/etablissements/config/PanneauCycles'
import PanneauCyclePage from '../../components/etablissements/config/PanneauCyclePage'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import './ConfigurationPage.css'
import './ScolaritePage.css'

const CYCLE_LABELS = {
  maternelle:'Maternelle', primaire:'Primaire', secondaire:'Secondaire', universitaire:'Université',
}
const CYCLE_ICONES = {
  maternelle:School, primaire:BookOpen, secondaire:GraduationCap, universitaire:Building2,
}
const LIBELLES_STATUT = {
  en_cours:'En cours', a_venir:'À venir', termine:'Terminée', suspendu:'Suspendue',
}

export default function ScolaritePage() {
  usePageTitle('Scolarité')
  const slug = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()
  const section        = searchParams.get('section')    ?? ''
  const cycleParam     = searchParams.get('cycle')      ?? ''
  const ongletURL      = searchParams.get('onglet')     ?? ''
  const anneeUuidParam = searchParams.get('annee_uuid') ?? ''

  const [acces,           setAcces]           = useState('chargement')
  const [toutesAnnees,    setToutesAnnees]    = useState([])
  const [anneeActive,     setAnneeActive]     = useState(null)
  const [cyclesActifs,    setCyclesActifs]    = useState([])
  const [cyclesAutorises, setCyclesAutorises] = useState([])

  // 1. Vérifier l'accès
  useEffect(() => {
    let c = false
    portailService.lire()
      .then((r) => {
        if (c) return
        const svc = r?.services?.find((s) => s.code === 'scolarite')
        if (!svc || !svc.accessible) { setAcces('refuse'); return }
        setAcces('autorise')
      })
      .catch(() => { if (!c) setAcces('refuse') })
    return () => { c = true }
  }, [])

  // 2. Charger toutes les années + cycles autorisés
  useEffect(() => {
    if (acces !== 'autorise') return
    let c = false
    Promise.all([anneesService.lister(), monEtablissementService.lire()])
      .then(([rAnnees, profil]) => {
        if (c) return
        const liste = Array.isArray(rAnnees?.data) ? rAnnees.data
          : Array.isArray(rAnnees) ? rAnnees : []
        setToutesAnnees(liste)

        let annee = null
        if (anneeUuidParam) {
          annee = liste.find((a) => a.uuid === anneeUuidParam) ?? null
        }
        if (!annee) {
          annee = liste.find((a) => a.statut === 'en_cours') ?? liste[0] ?? null
        }
        setAnneeActive(annee)

        if (annee && !anneeUuidParam) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('annee_uuid', annee.uuid)
            return next
          }, { replace: true })
        }

        setCyclesAutorises(
          (profil?.cyclesAutorises ?? []).filter((x) => x.statut === 'actif').map((x) => x.cycle),
        )
      })
      .catch(() => {})
    return () => { c = true }
  }, [acces]) // eslint-disable-line

  // 3. Charger les cycles actifs quand l'année change
  useEffect(() => {
    if (!anneeActive) return
    let c = false
    cyclesService.lister(anneeActive.uuid)
      .then((r) => {
        if (!c) setCyclesActifs((r?.data ?? r ?? []).filter((x) => x.actif))
      })
      .catch(() => {})
    return () => { c = true }
  }, [anneeActive?.uuid])

  const changerAnnee = useCallback((annee) => {
    setAnneeActive(annee)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('annee_uuid', annee.uuid)
      return next
    })
  }, [setSearchParams])

  const allerA  = useCallback((params) => setSearchParams(params), [setSearchParams])
  const marquer = useCallback(() => {}, [])
  const base    = lienEtablissement(slug, '/scolarite')

  if (acces === 'refuse') return <Navigate to={lienEtablissement(slug, '/portail')} replace />

  if (acces === 'chargement') {
    return (
      <div style={{ minHeight:'100dvh', display:'grid', placeItems:'center' }}>
        <Loader mode="inline" label="Vérification de l'accès…" />
      </div>
    )
  }

  const cyclesActifsValides = cyclesActifs.filter((c) => cyclesAutorises.includes(c.cycle))
  const navScolarite = buildNav(base, section, cycleParam, ongletURL, cyclesActifsValides)

  function renduContenu() {
    if (section === 'annees') return (
      <PanneauAnnees
        anneeActive={anneeActive}
        setAnneeActive={changerAnnee}
        onTerminee={marquer}
      />
    )
    if (section === 'cycles') return (
      <PanneauCycles
        anneeActive={anneeActive}
        cyclesAutorises={cyclesAutorises}
        onTerminee={marquer}
      />
    )
    if (cycleParam) return (
      <PanneauCyclePage
        cycle={cycleParam}
        cycleObj={cyclesActifsValides.find((c) => c.cycle === cycleParam)}
        anneeActive={anneeActive}
        onTerminee={marquer}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        cyclesDisponibles={cyclesActifsValides.map((c) => c.cycle)}
      />
    )
    return (
      <VueEnsemble
        anneeActive={anneeActive}
        toutesAnnees={toutesAnnees}
        cyclesActifs={cyclesActifsValides}
        cyclesAutorises={cyclesAutorises}
        allerA={allerA}
        changerAnnee={changerAnnee}
        slug={slug}
      />
    )
  }

  const migettes = [
    <Link key="p" to={lienEtablissement(slug, '/portail')}>Portail</Link>,
    <span key="s1" className="ap-bread-sep">/</span>,
    <Link key="sc" to={base}>Scolarité</Link>,
  ]
  if (cycleParam) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="cy">{CYCLE_LABELS[cycleParam] ?? cycleParam}</span>)
    const o = searchParams.get('onglet')
    if (o) { migettes.push(<span key="s3" className="ap-bread-sep">/</span>); migettes.push(<span key="on">{o}</span>) }
  } else if (section) {
    const labels = { annees:'Années académiques', cycles:'Activer des cycles' }
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="se">{labels[section] ?? section}</span>)
  }

  const estVueEnsemble = !section && !cycleParam

  return (
    <ModuleLayout titre="Scolarité" icone={GraduationCap} nav={navScolarite}>
      <div className="ap cfg">
        {/* Fil d'ariane + bandeau année : uniquement sur les sous-pages,
            pour rester cohérent avec le Dashboard (qui n'en a pas) */}
        {!estVueEnsemble && (
          <>
            <nav className="ap-bread" aria-label="Fil d'ariane">{migettes}</nav>

            <div className="cfg-annee-bandeau" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <CalendarDays size={14} aria-hidden="true" />
                <span>Année :</span>
                <strong>{anneeActive?.libelle ?? '-'}</strong>
                {anneeActive && (
                  <span className={`cfg-statut-badge ${anneeActive.statut}`}>
                    {LIBELLES_STATUT[anneeActive.statut] ?? anneeActive.statut}
                  </span>
                )}
              </div>
              {toutesAnnees.length > 1 && (
                <select
                  className="ap-input"
                  style={{ maxWidth:160, fontSize:'0.82rem', padding:'4px 8px', height:'auto' }}
                  value={anneeActive?.uuid ?? ''}
                  onChange={(e) => {
                    const a = toutesAnnees.find((x) => x.uuid === e.target.value)
                    if (a) changerAnnee(a)
                  }}
                  aria-label="Choisir une année académique"
                >
                  {toutesAnnees.map((a) => (
                    <option key={a.uuid} value={a.uuid}>
                      {a.libelle} {a.statut === 'en_cours' ? '(En cours)' : a.statut === 'a_venir' ? '(À venir)' : '(Terminée)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {renduContenu()}
      </div>
    </ModuleLayout>
  )
}

/* ── Navigation sidebar ── */
function buildNav(base, section, cycleParam, ongletURL, cyclesActifs) {
  const ONGLETS_CYCLE = {
    maternelle:    [{ id:'groupes', label:'Groupes' },{ id:'niveaux', label:'Niveaux' },{ id:'classes', label:'Classes' },{ id:'matieres', label:'Matières' }],
    primaire:      [{ id:'groupes', label:'Groupes' },{ id:'niveaux', label:'Niveaux' },{ id:'classes', label:'Classes' },{ id:'matieres', label:'Matières' }],
    secondaire:    [{ id:'groupes', label:'Sections' },{ id:'niveaux', label:'Niveaux' },{ id:'classes', label:'Classes' },{ id:'series', label:'Séries' },{ id:'matieres', label:'Matières' }],
    universitaire: [{ id:'groupes', label:'Départements' },{ id:'filieres', label:'Filières' },{ id:'niveaux', label:'Niveaux' },{ id:'cohortes', label:'Cohortes' },{ id:'matieres', label:'Matières' }],
  }
  const cycleItems = cyclesActifs.map((c) => ({
    label:   CYCLE_LABELS[c.cycle] ?? c.cycle,
    href:    `${base}?cycle=${c.cycle}&onglet=groupes`,
    Icon:    CYCLE_ICONES[c.cycle] ?? School,
    actif:   cycleParam === c.cycle,
    enfants: (ONGLETS_CYCLE[c.cycle] ?? []).map(({ id, label }) => ({
      label,
      href:  `${base}?cycle=${c.cycle}&onglet=${id}`,
      actif: cycleParam === c.cycle && ongletURL === id,
    })),
  }))
  return [
    {
      groupe: 'GESTION',
      items: [
        { label:'Vue d\'ensemble',     href: base,                     actif: !section && !cycleParam, Icon: GraduationCap },
        { label:'Années académiques',  href: `${base}?section=annees`, actif: section === 'annees',    Icon: CalendarDays },
        { label:'Activer des cycles',  href: `${base}?section=cycles`, actif: section === 'cycles',    Icon: School },
      ],
    },
    ...(cycleItems.length > 0 ? [{ groupe:'PAR CYCLE', items: cycleItems }] : []),
  ]
}

/* ── Vue d'ensemble - design identique au Dashboard ── */
function VueEnsemble({
  anneeActive, toutesAnnees, cyclesActifs, cyclesAutorises,
  allerA, changerAnnee, slug,
}) {
  const base        = lienEtablissement(slug, '/scolarite')
  const totalCycles = cyclesAutorises.length
  const actifs      = cyclesActifs.length
  const inactifs    = cyclesAutorises.filter((id) => !cyclesActifs.some((c) => c.cycle === id))

  return (
    <>
      {/* Bandeau accueil */}
      <section className="sc-welcome">
        <div>
          <h2 className="sc-welcome-title">Scolarité</h2>
          <p className="sc-welcome-sub">
            {anneeActive
              ? `Année ${anneeActive.libelle} - Gérez la structure pédagogique.`
              : "Créez d'abord une année académique pour commencer."}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {/* Sélecteur d'année (si plusieurs années) */}
          {toutesAnnees.length > 1 && (
            <select
              className="ap-input"
              style={{ fontSize:'0.82rem', padding:'6px 10px', height:'auto', minWidth:140 }}
              value={anneeActive?.uuid ?? ''}
              onChange={(e) => {
                const a = toutesAnnees.find((x) => x.uuid === e.target.value)
                if (a) changerAnnee(a)
              }}
              aria-label="Choisir une année académique"
            >
              {toutesAnnees.map((a) => (
                <option key={a.uuid} value={a.uuid}>
                  {a.libelle}
                </option>
              ))}
            </select>
          )}
          <Link to={`${base}?section=annees`} className="ap-btn ap-btn--ghost ap-btn--sm">
            <CalendarDays size={14} aria-hidden="true" /> Années
          </Link>
          <Link to={`${base}?section=cycles`} className="ap-btn ap-btn--gold">
            Activer des cycles <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* KPI stats */}
      <div className="sc-stats">
        <div className={`sc-stat ${anneeActive ? 'sc-stat--success' : 'sc-stat--warn'}`}>
          <div className="sc-stat-icon"><CalendarDays size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{anneeActive ? '1' : '0'}</p>
            <p className="sc-stat-lbl">Année active</p>
          </div>
        </div>
        <div className="sc-stat sc-stat--info">
          <div className="sc-stat-icon"><School size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{totalCycles}</p>
            <p className="sc-stat-lbl">Cycles autorisés</p>
          </div>
        </div>
        <div className="sc-stat sc-stat--success">
          <div className="sc-stat-icon"><CheckCircle2 size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{actifs}</p>
            <p className="sc-stat-lbl">Cycles actifs</p>
          </div>
        </div>
        <div className={`sc-stat ${inactifs.length > 0 ? 'sc-stat--warn' : 'sc-stat--info'}`}>
          <div className="sc-stat-icon"><AlertTriangle size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{inactifs.length}</p>
            <p className="sc-stat-lbl">Cycles à activer</p>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {!anneeActive && (
        <div className="sc-info">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Aucune année académique</strong>
            <p>
              <Link to={`${base}?section=annees`}>Créez une année académique</Link>{' '}
              pour commencer la configuration.
            </p>
          </div>
        </div>
      )}

      {anneeActive && totalCycles === 0 && (
        <div className="sc-info">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Aucun cycle autorisé</strong>
            <p>
              Faites une{' '}
              <Link to={lienEtablissement(slug, '/configuration?section=demandes-cycle')}>
                demande de cycle
              </Link>{' '}depuis la Configuration.
            </p>
          </div>
        </div>
      )}

      {/* Cycles actifs - grille de cartes */}
      {cyclesActifs.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 className="sc-section-title">Cycles actifs</h3>
          <div className="sc-grid">
            {cyclesActifs.map((c) => {
              const Icon = CYCLE_ICONES[c.cycle] ?? School
              return (
                <Link
                  key={c.uuid}
                  to={`${base}?cycle=${c.cycle}&onglet=groupes`}
                  className="sc-card"
                >
                  <div className="sc-card-icon"><Icon size={26} aria-hidden="true" /></div>
                  <p className="sc-card-label">{CYCLE_LABELS[c.cycle]}</p>
                  <p className="sc-card-desc">Configurer la structure pédagogique</p>
                  <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Cycles autorisés à activer */}
      {inactifs.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 className="sc-section-title">Cycles autorisés - à activer</h3>
          <div className="sc-grid">
            {inactifs.map((id) => {
              const Icon = CYCLE_ICONES[id] ?? School
              return (
                <Link
                  key={id}
                  to={`${base}?section=cycles`}
                  className="sc-card"
                >
                  <div className="sc-card-icon"><Icon size={26} aria-hidden="true" /></div>
                  <p className="sc-card-label">{CYCLE_LABELS[id]}</p>
                  <p className="sc-card-desc">Inactif - Cliquez pour activer</p>
                  <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Gestion */}
      <section style={{ marginBottom: 28 }}>
        <h3 className="sc-section-title">Gestion</h3>
        <div className="sc-grid">
          <Link to={`${base}?section=annees`} className="sc-card">
            <div className="sc-card-icon"><CalendarDays size={26} aria-hidden="true" /></div>
            <p className="sc-card-label">Années académiques</p>
            <p className="sc-card-desc">Créer et gérer les années scolaires</p>
            <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
          </Link>
          <Link to={`${base}?section=cycles`} className="sc-card">
            <div className="sc-card-icon"><School size={26} aria-hidden="true" /></div>
            <p className="sc-card-label">Activer des cycles</p>
            <p className="sc-card-desc">Activer les cycles pour cette année</p>
            <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}