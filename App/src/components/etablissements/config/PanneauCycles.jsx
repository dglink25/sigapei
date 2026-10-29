import { useEffect, useState } from 'react'
import { School, AlertTriangle, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { cyclesService } from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const CYCLES_DISPO = [
  { id: 'maternelle',    label: 'Maternelle',    sous: 'Petite, moyenne, grande section' },
  { id: 'primaire',      label: 'Primaire',       sous: 'CI, CP, CE1, CE2, CM1, CM2' },
  { id: 'secondaire',    label: 'Secondaire',     sous: 'Collège et lycée, séries' },
  { id: 'universitaire', label: 'Universitaire',  sous: 'Licence, Master, Doctorat…' },
]

export default function PanneauCycles({ anneeActive, cyclesAutorises = [], onTerminee }) {
  const notify = useNotify()
  const [cycles,     setCycles]     = useState([])
  const [chargement, setChargement] = useState(false)
  const [sauvegarde, setSauvegarde] = useState({})

  // Strictement les cycles autorisés pour cet établissement
  const cyclesDispo = CYCLES_DISPO.filter((c) => cyclesAutorises.includes(c.id))

  const charger = async () => {
    if (!anneeActive) return
    setChargement(true)
    try {
      const r = await cyclesService.lister(anneeActive.uuid)
      const liste = r?.data ?? r ?? []
      setCycles(liste)
      if (liste.some((c) => c.actif)) onTerminee('cycles')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [anneeActive?.uuid]) // eslint-disable-line

  const estActif = (id) => cycles.find((c) => c.cycle === id)?.actif ?? false

  const basculer = async (cycleId) => {
    if (!anneeActive) return
    const actuel = estActif(cycleId)
    setSauvegarde((s) => ({ ...s, [cycleId]: true }))
    try {
      await cyclesService.enregistrer({
        annee_uuid: anneeActive.uuid,
        cycle:      cycleId,
        actif:      !actuel,
      })
      await charger()
      notify.success(!actuel ? 'Cycle activé pour cette année' : 'Cycle désactivé pour cette année', cycleId)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setSauvegarde((s) => ({ ...s, [cycleId]: false }))
    }
  }

  if (!anneeActive) {
    return (
      <div className="ap-card">
        <div className="ap-empty">
          <AlertTriangle size={32} aria-hidden="true" />
          <p>Sélectionnez d'abord une année académique dans la section <strong>Années académiques</strong>.</p>
        </div>
      </div>
    )
  }

  if (cyclesDispo.length === 0) {
    return (
      <div className="ap-card">
        <div className="ap-empty">
          <AlertTriangle size={32} aria-hidden="true" />
          <p>Aucun cycle autorisé pour votre établissement. Rendez-vous dans <strong>Activer des cycles &gt; Demandes de cycles</strong> pour demander une autorisation d'extension.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Cycles actifs pour l'année</h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong> - Activez les cycles autorisés de votre établissement pour cette année scolaire.
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={chargement}>
          <RefreshCw size={14} className={chargement ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {chargement ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label="Chargement des cycles de l'année…" />
        </div>
      ) : (
        <div className="cfg-cycles-grille">
          {cyclesDispo.map(({ id, label, sous }) => {
            const actif = estActif(id)
            const busy  = sauvegarde[id]
            return (
              <button
                key={id}
                type="button"
                className={`cfg-cycle-carte${actif ? ' is-actif' : ''}`}
                onClick={() => basculer(id)}
                disabled={busy}
                aria-pressed={actif}
              >
                <span className="cfg-cycle-icone">
                  <School size={22} aria-hidden="true" />
                </span>
                <span className="cfg-cycle-nom">{label}</span>
                <span className="cfg-cycle-etat">
                  {busy ? 'Mise à jour…' : actif ? 'Activé' : 'Inactif'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--sg-text-muted)', marginTop: 2 }}>{sous}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
