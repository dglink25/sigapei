/**
 * ConfigurationPage - Page de configuration académique.
 *
 * La navigation est assurée par la sidebar unique de PortailLayout via
 * le paramètre ?section= dans l'URL. Cette page ne contient plus de
 * sidebar interne : une seule sidebar dans toute l'application.
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  LayoutGrid, CalendarDays, CheckCircle2, ChevronRight,
} from 'lucide-react'

import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService }    from '../../services/identite/portail.service'
import useSlugEtablissement  from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle          from '../../hooks/commun/usePageTitle'

import AccesDroitsPanel        from '../../components/etablissements/AccesDroitsPanel'
import InfosEtablissementPanel from '../../components/etablissements/InfosEtablissementPanel'
import PanneauAnnees           from '../../components/etablissements/config/PanneauAnnees'
import PanneauCycles           from '../../components/etablissements/config/PanneauCycles'
import PanneauSubdivisions     from '../../components/etablissements/config/PanneauSubdivisions'
import PanneauNiveaux          from '../../components/etablissements/config/PanneauNiveaux'
import PanneauSeries           from '../../components/etablissements/config/PanneauSeries'
import PanneauClasses          from '../../components/etablissements/config/PanneauClasses'
import PanneauCohortes         from '../../components/etablissements/config/PanneauCohortes'
import PanneauMatieres         from '../../components/etablissements/config/PanneauMatieres'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import './ConfigurationPage.css'

// Étapes pour la vue d'ensemble
const ETAPES_GUIDEES = [
  { id: 'annees',       num: 1, section: 'annees',       label: 'Créer une année académique',         sous: 'Renseignez les dates de début et de fin' },
  { id: 'cycles',       num: 2, section: 'cycles',       label: 'Activer les cycles pédagogiques',    sous: 'Maternelle, primaire, secondaire, universitaire' },
  { id: 'subdivisions', num: 3, section: 'subdivisions', label: 'Créer groupes et départements',      sous: 'Groupe A/B pour le primaire, départements pour l\'université' },
  { id: 'niveaux',      num: 4, section: 'niveaux',      label: 'Définir les niveaux scolaires',      sous: 'CI, CP, 6e, Tle, L1, L2…' },
  { id: 'classes',      num: 5, section: 'classes',      label: 'Configurer les classes',             sous: 'Associez niveau × groupe (× série si secondaire)' },
  { id: 'series',       num: 6, section: 'series',       label: 'Ajouter séries et filières',         sous: 'Optionnel : secondaire et université uniquement' },
  { id: 'cohortes',     num: 7, section: 'cohortes',     label: 'Créer les cohortes universitaires',  sous: 'Optionnel : université uniquement' },
  { id: 'matieres',     num: 8, section: 'matieres',     label: 'Configurer matières et coefficients',sous: 'Propagation automatique aux classes homologues' },
]

export default function ConfigurationPage() {
  usePageTitle('Configuration')
  const slug           = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()
  const section        = searchParams.get('section') ?? ''

  const [etab,         setEtab]         = useState(null)
  const [anneeActive,  setAnneeActive]  = useState(null)
  const [progres,      setProgres]      = useState({})

  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => { if (!annule) setEtab(r?.etablissement ?? null) })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  const allerA = (s) => setSearchParams(s ? { section: s } : {})
  const marquerTerminee = (id) => setProgres((p) => ({ ...p, [id]: true }))
  const pct = Math.round(
    (ETAPES_GUIDEES.filter((e) => progres[e.id]).length / ETAPES_GUIDEES.length) * 100,
  )

  const configBase = lienEtablissement(slug, '/configuration')
  const props = { anneeActive, setAnneeActive, onTerminee: marquerTerminee }

  // ── Rendu du panneau actif ──────────────────────────────────────────
  function renduSection() {
    switch (section) {
      case 'annees':        return <PanneauAnnees {...props} />
      case 'cycles':        return <PanneauCycles {...props} />
      case 'subdivisions':  return <PanneauSubdivisions {...props} />
      case 'niveaux':       return <PanneauNiveaux {...props} />
      case 'series':        return <PanneauSeries {...props} />
      case 'classes':       return <PanneauClasses {...props} />
      case 'cohortes':      return <PanneauCohortes {...props} />
      case 'matieres':      return <PanneauMatieres {...props} />
      case 'droits':        return <AccesDroitsPanel />
      case 'etablissement': return <InfosEtablissementPanel />
      default:              return <VueEnsemble etab={etab} progres={progres} pct={pct} allerA={allerA} configBase={configBase} />
    }
  }

  // ── Fil d'ariane ───────────────────────────────────────────────────
  const libelleSection = section
    ? (ETAPES_GUIDEES.find((e) => e.section === section)?.label
      ?? { droits: 'Droits d\'accès', etablissement: 'Infos établissement' }[section]
      ?? section)
    : null

  return (
    <div className="ap cfg">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={lienEtablissement(slug, '/portail')}>Portail</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <Link to={configBase}>Configuration</Link>
        {libelleSection && (
          <>
            <span className="ap-bread-sep" aria-hidden="true">/</span>
            <span>{libelleSection}</span>
          </>
        )}
      </nav>

      {/* Contexte année active */}
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

      {renduSection()}
    </div>
  )
}

// ── Vue d'ensemble ────────────────────────────────────────────────────

function VueEnsemble({ etab, progres, pct, allerA, configBase }) {
  return (
    <>
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            Configuration{etab ? ` · ${etab.nom}` : ''}
          </h2>
          <p className="ap-page-sub">
            Organisez la structure académique de votre établissement, étape par étape.
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="ap-card cfg-progress-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Progression de la configuration</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--sg-text-muted)' }}>
            {ETAPES_GUIDEES.filter((e) => progres[e.id]).length} / {ETAPES_GUIDEES.length} étapes
          </span>
        </div>
        <div className="cfg-progress-barre" style={{ height: 10 }}>
          <div
            className="cfg-progress-remplie"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Étapes guidées */}
      <h3 style={{ marginTop: 28, marginBottom: 12, fontSize: '0.95rem', fontWeight: 700 }}>
        Parcours de configuration
      </h3>
      <div className="cfg-etapes">
        {ETAPES_GUIDEES.map(({ id, num, label, sous, section }) => {
          const terminee = progres[id]
          return (
            <button
              key={id}
              type="button"
              className={`cfg-etape${terminee ? ' is-terminee' : ''}`}
              onClick={() => allerA(section)}
            >
              <span className={`cfg-etape-num${terminee ? ' is-terminee' : ''}`}>
                {terminee ? <CheckCircle2 size={14} aria-hidden="true" /> : num}
              </span>
              <span>
                <span className="cfg-etape-texte">{label}</span>
                {sous && (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sg-text-muted)', marginTop: 2 }}>
                    {sous}
                  </span>
                )}
              </span>
              {terminee
                ? <span className="ap-badge ap-badge--success" style={{ marginLeft: 'auto' }}>Configuré</span>
                : <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--sg-text-muted)' }} aria-hidden="true" />
              }
            </button>
          )
        })}
      </div>
    </>
  )
}

// ── Constantes ────────────────────────────────────────────────────────

const LIBELLES_STATUT = {
  en_cours: 'En cours',
  a_venir:  'À venir',
  termine:  'Terminée',
  suspendu: 'Suspendue',
}
