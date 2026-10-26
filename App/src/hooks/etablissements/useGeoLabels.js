import { useEffect, useState } from 'react'
import { geoService } from '../../services/etablissements/etablissement.service'

/** Retrouve les libelles (pays, region, commune, arrondissement) d'une demande a partir de ses uuid. */
export function useGeoLabels(form) {
  const [labels, setLabels] = useState(form.geo_labels)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = { ...form.geo_labels }
      try {
        if (form.pays && !out.pays) out.pays = (await geoService.pays()).find((i) => i.uuid === form.pays)?.nom ?? ''
        if (form.pays && form.departement && !out.departement) out.departement = (await geoService.departements(form.pays)).find((i) => i.uuid === form.departement)?.nom ?? ''
        if (form.departement && form.commune && !out.commune) out.commune = (await geoService.communes(form.departement)).find((i) => i.uuid === form.commune)?.nom ?? ''
        if (form.commune && form.arrondissement && !out.arrondissement) out.arrondissement = (await geoService.arrondissements(form.commune)).find((i) => i.uuid === form.arrondissement)?.nom ?? ''
      } catch { /* libelles indisponibles : on affichera ce qui est connu */ }
      if (alive) setLabels(out)
    })()
    return () => { alive = false }
  }, [form.pays, form.departement, form.commune, form.arrondissement, form.geo_labels])
  return labels
}
