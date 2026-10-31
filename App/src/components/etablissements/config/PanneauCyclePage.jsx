import { AlertTriangle } from 'lucide-react'

import PanneauSubdivisions from './PanneauSubdivisions'
import PanneauNiveaux      from './PanneauNiveaux'
import PanneauClasses      from './PanneauClasses'
import PanneauSeries       from './PanneauSeries'
import PanneauCohortes     from './PanneauCohortes'
import PanneauMatieres     from './PanneauMatieres'

// Onglets par cycle avec respect de la terminologie institutionnelle
const ONGLETS_CYCLE = {
  maternelle: [
    { id: 'groupes',  label: 'Groupes' },
    { id: 'niveaux',  label: 'Niveaux' },
    { id: 'classes',  label: 'Classes' },
    { id: 'matieres', label: 'Matières' },
  ],
  primaire: [
    { id: 'groupes',  label: 'Groupes' },
    { id: 'niveaux',  label: 'Niveaux' },
    { id: 'classes',  label: 'Classes' },
    { id: 'matieres', label: 'Matières' },
  ],
  secondaire: [
    { id: 'niveaux',  label: 'Promotions' },
    { id: 'series',   label: 'Séries' },
    { id: 'classes',  label: 'Classes' },
    { id: 'matieres', label: 'Matières' },
  ],
  universitaire: [
    { id: 'groupes',  label: 'Cycles & Départements' },
    { id: 'filieres', label: 'Options / Filières' },
    { id: 'niveaux',  label: "Niveaux d'études" },
    { id: 'cohortes', label: 'Cohortes' },
    { id: 'matieres', label: 'Matières / UE' },
  ],
}

const CYCLE_LABELS = {
  maternelle: 'Maternelle', primaire: 'Primaire',
  secondaire: 'Secondaire', universitaire: 'Université',
}

export default function PanneauCyclePage({
  cycle, cycleObj, anneeActive, onTerminee, searchParams, setSearchParams, cyclesDisponibles: cyclesDisponiblesProps = [],
}) {
  const onglets     = ONGLETS_CYCLE[cycle] ?? []
  const ongletActif = searchParams.get('onglet') ?? onglets[0]?.id ?? ''

  const allerOnglet = (id) =>
    setSearchParams({ cycle, onglet: id })

  // Cycles disponibles pour les panneaux enfants :
  // on utilise ceux passés en props, ou à défaut uniquement le cycle courant
  const cyclesDisponibles = cyclesDisponiblesProps.length > 0
    ? cyclesDisponiblesProps
    : (cycle ? [cycle] : [])

  const propsCommuns = {
    anneeActive,
    onTerminee,
    cycleFiltre: cycle,
    cycleObj,
    cyclesDisponibles,
  }

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique dans <strong>Années académiques</strong>.</p>
      </div>
    )
  }

  function renduOnglet() {
    switch (ongletActif) {
      case 'groupes':
        return (
          <PanneauSubdivisions
            {...propsCommuns}
            labelTitre={cycle === 'universitaire' ? 'Cycles & Départements' : 'Groupes'}
            labelType={cycle === 'universitaire' ? 'departement' : 'groupe'}
          />
        )
      case 'filieres':
        return <PanneauSeries {...propsCommuns} cycleForce="universitaire" labelTitre="Options / Filières" />
      case 'niveaux':
        return (
          <PanneauNiveaux
            {...propsCommuns}
            labelTitre={cycle === 'secondaire' ? 'Promotions' : cycle === 'universitaire' ? "Niveaux d'études" : 'Niveaux'}
          />
        )
      case 'classes':
        return <PanneauClasses {...propsCommuns} />
      case 'series':
        return <PanneauSeries {...propsCommuns} cycleForce="secondaire" labelTitre="Séries" />
      case 'cohortes':
        return <PanneauCohortes {...propsCommuns} />
      case 'matieres':
        return <PanneauMatieres {...propsCommuns} />
      default:
        return null
    }
  }

  return (
    <div className="cfg-tab">
      {/* En-tête du cycle */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">{CYCLE_LABELS[cycle] ?? cycle}</h2>
          <p className="ap-page-sub">
            Configurez l'organisation pédagogique du cycle {CYCLE_LABELS[cycle]?.toLowerCase()}
            {anneeActive ? ` pour l'année ${anneeActive.libelle}` : ''}.
          </p>
        </div>
      </div>

      {/* Onglets contextuels */}
      <div className="cfg-onglets" role="tablist" aria-label={`Onglets ${CYCLE_LABELS[cycle]}`}>
        {onglets.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={ongletActif === id}
            className={`cfg-onglet${ongletActif === id ? ' is-actif' : ''}`}
            onClick={() => allerOnglet(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet */}
      <div className="cfg-onglet-contenu">
        {renduOnglet()}
      </div>
    </div>
  )
}