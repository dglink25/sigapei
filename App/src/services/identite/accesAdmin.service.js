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

async function appel(promesse) {
  try {
    return await promesse
  } catch (err) {
    const m = err?.code ? MESSAGES_ERREUR[err.code] : null
    if (m) err.message = typeof m === 'function' ? m(err.details?.error?.details) : m
    throw err
  }
}

const A = '/acces-services'

/** Gestion des droits d'accès par l'administrateur de l'établissement. */
export const accesAdmin = {
  services: () => appel(api.get(`${A}/services`)),
  utilisateursDuService: (serviceUuid, params) => appel(api.get(`${A}/services/${serviceUuid}/utilisateurs${qs(params)}`)),
  droitsUtilisateur: (uuid) => appel(api.get(`${A}/utilisateurs/${uuid}`)),
  definir: (utilisateurUuid, serviceUuid, autorise) =>
    appel(api.put(`${A}/utilisateurs/${utilisateurUuid}/services/${serviceUuid}`, { autorise })),
  definirLot: (serviceUuid, accords) => appel(api.put(`${A}/services/${serviceUuid}/utilisateurs`, { accords })),
}
