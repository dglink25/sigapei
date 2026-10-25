/**
 * ConfigurationPage - Configuration académique par cycle.
 *
 * Navigation : ?section= pour les sections globales (vue-ensemble, annees)
 *              ?cycle=primaire&onglet=groupes pour les sections par cycle
 *
 * Chaque cycle actif affiche uniquement les onglets qui lui sont pertinents.
 */
import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays, ChevronRight, CheckCircle2,
  School, BookOpen, GraduationCap, Building2,
} from 'lucide-react'

import { lienEtablissement }    from '../../lib/etablissements/subdomain'
import { portailService }       from '../../services/identite/portail.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import useSlugEtablissement     from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle             from '../../hooks/commun/usePageTitle'

import AccesDroitsPanel         from '../../components/etablissements/AccesDroitsPanel'
import InfosEtablissementPanel  from '../../components/etablissements/InfosEtablissementPanel'
import PanneauAnnees            from '../../components/etablissements/config/PanneauAnnees'
import PanneauCyclePage         from '../../components/etablissements/config/PanneauCyclePage'
import PanneauDemandesCycle     from '../../components/etablissements/config/PanneauDemandesCycle'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import './ConfigurationPage.css'

// Étapes pour la vue d'ensemble
const ETAPES = [
  { id: 'annees',  label: 'Créer une année académique',   sous: 'Point de départ obligatoire', section: 'annees' },
  { id: 'cycles',  label: 'Activer vos cycles',           sous: 'Maternelle, primaire, secondaire, université', section: 'annees' },
  { id: 'config',  label: 'Configurer chaque cycle',      sous: 'Groupes, niveaux, classes, matières…', section: null },
]

const LIBELLES_STATUT = {
  en_cours: 'En cours', a_venir: 'À venir', termine: 'Terminée', suspendu: 'Suspendue',
}

export default function ConfigurationPage() {
  usePageTitle('Configuration')
  const slug              = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()
  const section           = searchParams.get('section') ?? ''
  const cycleParam        = searchParams.get('cycle')   ?? ''

  const [etab,         setEtab]         = useState(null)
  const [anneeActive,  setAnneeActive]  = useState(null)
  const [cyclesActifs, setCyclesActifs] = useState([])
  const [progres,      setProgres]      = useState({})

  // Charger portail
  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => { if (!annule) setEtab(r?.etablissement ?? null) })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  // Charger l'année active
  useEffect(() => {
    let annule = false
    anneesService.lister()
      .then((r) => {
        if (annule) return
        const liste = r?.data ?? r ?? []
        const active = liste.find((a) => a.statut === 'en_cours') ?? liste[0] ?? null
        setAnneeActive(active)
        if (liste.length > 0) setProgres((p) => ({ ...p, annees: true }))
      })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  // Charger les cycles actifs dès qu'on a une année
  useEffect(() => {
    if (!anneeActive) return
    let annule = false
    cyclesService.lister(anneeActive.uuid)
      .then((r) => {
        if (annule) return
        const liste = (r?.data ?? r ?? []).filter((c) => c.actif)
        setCyclesActifs(liste)
        if (liste.length > 0) setProgres((p) => ({ ...p, cycles: true }))
      })
      .catch(() => {})
    return () => { annule = true }
  }, [anneeActive?.uuid])

  const allerA = useCallback((params) => setSearchParams(params), [setSearchParams])
  const marquerTerminee = useCallback(
    (id) => setProgres((p) => ({ ...p, [id]: true })),
    [],
  )

  const configBase = lienEtablissement(slug, '/configuration')

  // ── Rendu du contenu ───────────────────────────────────────────────
  function renduContenu() {
    // Sections globales
    if (section === 'annees') {
      return (
        <PanneauAnnees
          anneeActive={anneeActive}
          setAnneeActive={setAnneeActive}
          onTerminee={marquerTerminee}
        />
      )
    }
    if (section === 'droits')           return <AccesDroitsPanel />
    if (section === 'etablissement')    return <InfosEtablissementPanel />
    if (section === 'demandes-cycle')   return <PanneauDemandesCycle />

    // Navigation par cycle
    if (cycleParam) {
      const cycleObj = cyclesActifs.find((c) => c.cycle === cycleParam)
      return (
        <PanneauCyclePage
          cycle={cycleParam}
          cycleObj={cycleObj}
          anneeActive={anneeActive}
          onTerminee={marquerTerminee}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      )
    }

    // Vue d'ensemble
    return (
      <VueEnsemble
        etab={etab}
        anneeActive={anneeActive}
        cyclesActifs={cyclesActifs}
        progres={progres}
        allerA={allerA}
      />
    )
  }

  // ── Fil d'ariane ───────────────────────────────────────────────────
  const migettes = [
    <Link key="portail" to={lienEtablissement(slug, '/portail')}>Portail</Link>,
    <span key="s1" className="ap-bread-sep">/</span>,
    <Link key="config" to={configBase}>Configuration</Link>,
  ]
  if (cycleParam) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="cycle">{CYCLE_LABELS[cycleParam] ?? cycleParam}</span>)
    const onglet = searchParams.get('onglet')
    if (onglet) {
      migettes.push(<span key="s3" className="ap-bread-sep">/</span>)
      migettes.push(<span key="ong">{onglet}</span>)
    }
  } else if (section) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="sec">{SECTION_LABELS[section] ?? section}</span>)
  }

  return (
    <div className="ap cfg">
      <nav className="ap-bread" aria-label="Fil d'ariane">{migettes}</nav>

      {anneeActive && (
        <div className="cfg-annee-bandeau">
          <CalendarDays size={14} aria-hidden="true" />
          <span>Année active :</span>
          <strong>{anneeActive.libelle}</strong>
          <span className={`cfg-statut-badge ${anneeActive.statut}`}>
            {LIBELLES_STATUT[anneeActive.statut] ?? anneeActive.statut}
          </span>
        </div>
      )}

      {renduContenu()}
    </div>
  )
}

// ── Vue d'ensemble ────────────────────────────────────────────────────

function VueEnsemble({ etab, anneeActive, cyclesActifs, progres, allerA }) {
  const toutesEtapesOk = ETAPES.every((e) => progres[e.id])
  const pct = Math.round((Object.keys(progres).length / (ETAPES.length + cyclesActifs.length)) * 100)

  return (
    <>
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            Configuration{etab ? ` · ${etab.nom}` : ''}
          </h2>
          <p className="ap-page-sub">
            Configurez l'organisation académique de votre établissement.
          </p>
        </div>
      </div>

      {/* Progression */}
      <div className="ap-card cfg-progress-wrap">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontWeight:600, fontSize:'0.92rem' }}>Progression</span>
          <span style={{ fontSize:'0.82rem', color:'var(--sg-text-muted)' }}>{Math.min(pct,100)} %</span>
        </div>
        <div className="cfg-progress-barre" style={{ height:10 }}>
          <div className="cfg-progress-remplie" style={{ width:`${Math.min(pct,100)}%` }}
            role="progressbar" aria-valuenow={Math.min(pct,100)} aria-valuemin={0} aria-valuemax={100} />
        </div>
      </div>

      {/* Étapes de base */}
      <h3 style={{ marginTop:28, marginBottom:12, fontSize:'0.95rem', fontWeight:700 }}>
        1 - Configuration de base
      </h3>
      <div className="cfg-etapes">
        {ETAPES.map(({ id, label, sous, section }) => {
          const ok = progres[id]
          return (
            <button key={id} type="button"
              className={`cfg-etape${ok ? ' is-terminee' : ''}`}
              onClick={() => section && allerA({ section })}
            >
              <span className={`cfg-etape-num${ok ? ' is-terminee' : ''}`}>
                {ok ? <CheckCircle2 size={14} /> : null}
                {!ok && ETAPES.indexOf(ETAPES.find(e=>e.id===id)) + 1}
              </span>
              <span>
                <span className="cfg-etape-texte">{label}</span>
                <span style={{ display:'block', fontSize:'0.78rem', color:'var(--sg-text-muted)', marginTop:2 }}>{sous}</span>
              </span>
              {ok
                ? <span className="ap-badge ap-badge--success" style={{ marginLeft:'auto' }}>Fait</span>
                : <ChevronRight size={16} style={{ marginLeft:'auto', color:'var(--sg-text-muted)' }} />
              }
            </button>
          )
        })}
      </div>

      {/* Cycles actifs */}
      {cyclesActifs.length > 0 && (
        <>
          <h3 style={{ marginTop:32, marginBottom:12, fontSize:'0.95rem', fontWeight:700 }}>
            2 - Configurer chaque cycle
          </h3>
          <p style={{ marginBottom:14, fontSize:'0.88rem', color:'var(--sg-text-muted)' }}>
            Cliquez sur un cycle pour configurer ses groupes, niveaux, classes et matières.
          </p>
          <div className="cfg-cycles-grille">
            {cyclesActifs.map((c) => {
              const Icon = CYCLE_ICONES[c.cycle] ?? School
              return (
                <button key={c.uuid} type="button"
                  className="cfg-cycle-carte is-actif"
                  onClick={() => allerA({ cycle: c.cycle })}
                >
                  <span className="cfg-cycle-icone">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="cfg-cycle-nom">{CYCLE_LABELS[c.cycle]}</span>
                  <span className="cfg-cycle-etat">Configurer</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {cyclesActifs.length === 0 && anneeActive && (
        <div className="ap-alert ap-alert--warning" style={{ marginTop:24 }}>
          <span>Aucun cycle actif pour l'année {anneeActive.libelle}. Allez dans
            <button type="button" style={{ border:0, background:'none', color:'inherit', fontWeight:700, cursor:'pointer', textDecoration:'underline', fontFamily:'inherit' }}
              onClick={() => allerA({ section:'annees' })}>
              {' '}Années académiques
            </button> pour activer des cycles.
          </span>
        </div>
      )}
    </>
  )
}

// ── Constantes ────────────────────────────────────────────────────────

export const CYCLE_LABELS = {
  maternelle: 'Maternelle', primaire: 'Primaire',
  secondaire: 'Secondaire', universitaire: 'Université',
}

const CYCLE_ICONES = {
  maternelle:    School,
  primaire:      BookOpen,
  secondaire:    GraduationCap,
  universitaire: Building2,
}

const SECTION_LABELS = {
  annees: 'Années académiques', droits: "Droits d'accès", etablissement: 'Infos établissement',
}
