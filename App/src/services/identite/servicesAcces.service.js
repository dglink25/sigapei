import { authApi as api } from '../../lib/commun/http'
import { MESSAGES_ERREUR } from '../../config/services/config'

const qs = (o = {}) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** Remplace le message technique par un texte clair pour les codes d'erreur metier connus. */
async function appel(promesse) {
  try {
    return await promesse
  } catch (err) {
    const m = err?.code ? MESSAGES_ERREUR[err.code] : null
    if (m) err.message = typeof m === 'function' ? m(err.details?.error?.details) : m
    throw err
  }
}

const A = '/services-etablissements'

/** Microservice Identite : catalogue des services et acces des etablissements (super administrateur). */
export const servicesAcces = {
  /* ---- Catalogue ---- */
  lister: (params) => appel(api.get(`/services${qs(params)}`)),
  obtenir: (uuid) => appel(api.get(`/services/${uuid}`)),
  creer: (body) => appel(api.post('/services', body)),
  modifier: (uuid, body) => appel(api.put(`/services/${uuid}`, body)),
  supprimer: (uuid) => appel(api.delete(`/services/${uuid}`)),

  /* ---- Assignations ---- */
  listerParEtablissement: (uuid) => appel(api.get(`${A}/etablissements/${uuid}`)),
  listerParService: (uuid, params) => appel(api.get(`${A}/services/${uuid}${qs(params)}`)),
  resume: () => appel(api.get(`${A}/resume`)),
  journal: (params) => appel(api.get(`${A}/journal${qs(params)}`)),

  assigner: (etablissementUuid, serviceUuids) => appel(api.post(A, { etablissementUuid, serviceUuids })),
  assignerEtablissements: (serviceUuid, etablissementUuids) =>
    appel(api.post(`${A}/services/${serviceUuid}/etablissements`, { etablissementUuids })),
  bloquer: (uuid, motif) => appel(api.post(`${A}/${uuid}/bloquer`, motif ? { motif } : {})),
  reactiver: (uuid) => appel(api.post(`${A}/${uuid}/reactiver`)),
  retirer: (uuid) => appel(api.delete(`${A}/${uuid}`)),
  changerStatutLot: (assignationUuids, status, motif) =>
    appel(api.post(`${A}/lot/statut`, { assignationUuids, status, ...(motif ? { motif } : {}) })),

  /** Toutes les assignations d'un service (pages de 100) : sert a griser les etablissements deja assignes. */
  async toutesAssignationsDuService(uuid) {
    const out = []
    for (let page = 1; page <= 20; page += 1) {
      const r = await this.listerParService(uuid, { page, limite: 100 })
      out.push(...(r?.assignations ?? []))
      if (!r?.pagination || page >= r.pagination.pages) break
    }
    return out
  },
}
