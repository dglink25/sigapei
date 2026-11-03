import { useCallback, useEffect, useMemo, useState } from 'react'
import { classesService } from '../../services/etablissements/configurationAcademique.service'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { libelleCycle } from '../../config/evaluations/constantes'

const CYCLES_EVALUES = ['primaire', 'secondaire', 'universitaire']

/** Classe Établissements -> { uuid, nom, cycle, niveau }. */
const versClasse = (c) => ({
  uuid: c.uuid,
  nom: c.nom || c.sigle || null,
  cycle: c.cycle ?? c.niveau?.cycle ?? null,
  niveau: c.niveau?.nom ?? null,
})

/**
 * Classes utilisables par le profil :
 *  - administrateur : toutes les classes de l'établissement (Établissements) ;
 *  - enseignant : uniquement celles de ses affectations (RH, via Évaluations), avec leurs matières ;
 *    les noms viennent d'Établissements quand ils sont lisibles, sinon une référence courte est affichée.
 */
export function useClassesAccessibles(role, onErreur) {
  const [etat, setEtat] = useState({ classes: [], affectations: [], chargement: true, nomsIndisponibles: false })

  const charger = useCallback(async () => {
    setEtat((e) => ({ ...e, chargement: true }))
    const lireClasses = classesService.lister()
      .then((r) => (Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []).map(versClasse))
      .catch(() => null)
    try {
      if (role === 'enseignant') {
        const [affectations, classes] = await Promise.all([evaluationsService.mesAffectations(), lireClasses])
        const parUuid = new Map((classes ?? []).map((c) => [c.uuid, c]))
        const uuids = [...new Set(affectations.map((a) => a.classe_uuid))]
        setEtat({
          classes: uuids.map((u) => parUuid.get(u) ?? { uuid: u, nom: null, cycle: null, niveau: null }),
          affectations,
          chargement: false,
          nomsIndisponibles: uuids.some((u) => !parUuid.has(u)),
        })
      } else {
        const classes = await lireClasses
        if (classes === null) throw new Error('Liste des classes indisponible.')
        setEtat({ classes, affectations: [], chargement: false, nomsIndisponibles: false })
      }
    } catch (err) {
      setEtat({ classes: [], affectations: [], chargement: false, nomsIndisponibles: false })
      onErreur?.(err)
    }
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger() }, [charger])

  const classes = useMemo(
    () => [...etat.classes].sort((a, b) => (a.nom ?? '~').localeCompare(b.nom ?? '~', 'fr', { numeric: true })),
    [etat.classes],
  )
  return { ...etat, classes, recharger: charger }
}

export const libelleClasse = (c) => {
  if (!c) return '-'
  const nom = c.nom ?? `Classe réf. ${c.uuid.slice(0, 8)}`
  return c.niveau && c.nom && !c.nom.includes(c.niveau) ? `${nom} (${c.niveau})` : nom
}

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
