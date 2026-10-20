import { useEffect, useMemo, useState } from 'react'
import { LEVEL_LABELS } from '../../config/etablissements/config'
import { geoService } from '../../services/etablissements/etablissement.service'
import Loader from '../commun/Loader'

const flag = (iso) =>
  iso && iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : ''

const CHILDREN = {
  pays: ['departement', 'commune', 'arrondissement'],
  departement: ['commune', 'arrondissement'],
  commune: ['arrondissement'],
  arrondissement: [],
}

/** Hook : charge une liste geographique selon son parent (cache dans le service). */
function useGeoList(loader, parent, enabled) {
  const [state, setState] = useState({ items: [], loading: false })
  useEffect(() => {
    if (!enabled || !parent) { setState({ items: [], loading: false }); return undefined }
    let alive = true
    setState({ items: [], loading: true })
    loader(parent)
      .then((items) => alive && setState({ items, loading: false }))
      .catch(() => alive && setState({ items: [], loading: false }))
    return () => { alive = false }
  }, [loader, parent, enabled])
  return state
}

/**
 * Selects en cascade : pays du monde -> departement/region -> commune -> arrondissement/quartier.
 * Si un niveau n'est pas reference pour le pays choisi, il devient un champ de saisie libre.
 */
export default function GeoSelects({ value, libre, onChange, disabled }) {
  const [pays, setPays] = useState({ items: [], loading: true })
  useEffect(() => {
    let alive = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    geoService.pays().then((items) => alive && setPays({ items, loading: false })).catch(() => alive && setPays({ items: [], loading: false }))
    return () => { alive = false }
  }, [])

  const deps = useGeoList(geoService.departements, value.pays, true)
  const coms = useGeoList(geoService.communes, value.departement, true)
  const arrs = useGeoList(geoService.arrondissements, value.commune, true)

  const lists = { pays, departement: deps, commune: coms, arrondissement: arrs }

  const counts = useMemo(
    () => ({
      departement: value.pays && !deps.loading ? deps.items.length : 0,
      commune: value.departement && !coms.loading ? coms.items.length : 0,
      arrondissement: value.commune && !arrs.loading ? arrs.items.length : 0,
    }),
    [value.pays, value.departement, value.commune, deps, coms, arrs],
  )
  const countsKey = JSON.stringify(counts)
  useEffect(() => {
    if (JSON.stringify(value.geo_counts) !== countsKey) onChange({ geo_counts: counts })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey])

  function pick(level, uuid) {
    const nom = lists[level].items.find((i) => i.uuid === uuid)?.nom ?? ''
    const labels = { ...value.geo_labels, [level]: nom }
    const nextLibre = { ...libre }
    const patch = { [level]: uuid }
    CHILDREN[level].forEach((l) => {
      patch[l] = ''
      labels[l] = ''
      if (l in nextLibre) nextLibre[l] = ''
    })
    onChange({ ...patch, geo_labels: labels, localisation_libre: nextLibre })
  }

  const levels = ['pays', 'departement', 'commune', 'arrondissement']
  const parentOf = { pays: true, departement: value.pays, commune: value.departement, arrondissement: value.commune }

  return (
    <div className="dm-geo">
      {levels.map((lvl) => {
        const { items, loading } = lists[lvl]
        const id = `geo-${lvl}`
        const ready = Boolean(parentOf[lvl])
        const noData = lvl !== 'pays' && ready && !loading && items.length === 0

        return (
          <div key={lvl} className="dm-geo-item">
            <label htmlFor={id} className="dm-label">
              {LEVEL_LABELS[lvl]}{lvl === 'pays' && <span className="dm-req" aria-hidden="true"> *</span>}
            </label>

            {noData ? (
              /* Saisie libre si le niveau n'est pas référencé */
              <input
                id={id}
                className="dm-input"
                type="text"
                placeholder="Non référencé : saisissez-le manuellement"
                value={libre[lvl] ?? ''}
                onChange={(e) => onChange({ localisation_libre: { ...libre, [lvl]: e.target.value } })}
                disabled={disabled}
              />
            ) : loading && ready ? (
              /* Loader animé pendant le chargement de la liste */
              <div className="dm-geo-loader" aria-label="Chargement en cours">
                <Loader mode="inline" size="sm" label="Chargement…" />
              </div>
            ) : (
              <select
                id={id}
                className="dm-input"
                value={value[lvl] ?? ''}
                onChange={(e) => pick(lvl, e.target.value)}
                disabled={disabled || !ready || loading}
              >
                <option value="">
                  {ready ? 'Sélectionnez…' : 'Sélectionnez d\'abord le niveau précédent'}
                </option>
                {items.map((i) => (
                  <option key={i.uuid} value={i.uuid}>
                    {lvl === 'pays' ? `${flag(i.code_iso)} ${i.nom}`.trim() : i.nom}
                  </option>
                ))}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}
