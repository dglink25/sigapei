import { useEffect, useState } from 'react'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { libelleCycle } from '../../config/evaluations/constantes'

export { libelleClasse, useClassesAccessibles } from '../modules/classes'

const CYCLES_EVALUES = ['primaire', 'secondaire', 'universitaire']

/** Périodes, de la plus récente à la plus ancienne ; filtrées sur le cycle de la classe quand il est connu. */
export function usePeriodes(cycle, onErreur) {
  const [etat, setEtat] = useState({ periodes: [], chargement: true })
  useEffect(() => {
    let annule = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtat((e) => ({ ...e, chargement: true }))
    evaluationsService.periodes(CYCLES_EVALUES.includes(cycle) ? { cycle } : {})
      .then((r) => { if (!annule) setEtat({ periodes: r.elements, chargement: false }) })
      .catch((err) => { if (!annule) { setEtat({ periodes: [], chargement: false }); onErreur?.(err) } })
    return () => { annule = true }
  }, [cycle]) // eslint-disable-line react-hooks/exhaustive-deps
  return etat
}

export const libellePeriode = (p, avecCycle = false) =>
  p ? `${p.libelle} ${p.annee_scolaire}${avecCycle ? ` - ${libelleCycle(p.cycle)}` : ''}` : '-'

/** Période par défaut : l'ouverte la plus récente, sinon la plus récente. */
export const periodeParDefaut = (periodes) => periodes.find((p) => p.statut === 'ouverte') ?? periodes[0] ?? null
