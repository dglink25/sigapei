/**
 * Service - Demandes d'extension de cycle.
 *
 * Côté établissement  : via /etab-interne (proxy Vite → secret.interne + contexte.tenant)
 * Côté super admin    : via /etab-interne (proxy Vite → secret.interne uniquement)
 */
import { createHttp } from '../../lib/commun/http'
import { tokenStore, decodeJwt } from '../../lib/identite/tokenStore'
import { ADMIN_BASE } from '../../config/etablissements/config'

const base = createHttp(ADMIN_BASE)

function headersContexte() {
  const payload  = decodeJwt(tokenStore.getAccess() ?? '')
  const roleCode = payload?.roleCode ?? payload?.role ?? ''
  const tenantId = payload?.tenantId ?? payload?.tenant_id ?? ''
  const headers  = {}
  if (roleCode) headers['X-User-Role']   = roleCode
  if (tenantId) headers['X-Tenant-Uuid'] = tenantId
  return headers
}

const etabApi  = () => base.withHeaders(headersContexte())
const adminApi = () => base  // secret.interne injecté par le proxy

// ── Côté établissement ─────────────────────────────────────────────
export const demandesCycleEtabService = {
  lister:   () =>
    etabApi().get('/interne/mon-etablissement/demandes-cycle'),

  soumettre: (body) =>
    etabApi().post('/interne/mon-etablissement/demandes-cycle', body),

  annuler:  (uuid) =>
    etabApi().delete(`/interne/mon-etablissement/demandes-cycle/${uuid}`),
}

// ── Côté Super Administrateur ──────────────────────────────────────
export const demandesCycleAdminService = {
  lister:   (statut = 'en_attente') =>
    adminApi().get(`/interne/demandes-cycle?statut=${statut}`),

  accepter: (uuid, note = '') =>
    adminApi().post(`/interne/demandes-cycle/${uuid}/accepter`, { note }),

  refuser:  (uuid, note) =>
    adminApi().post(`/interne/demandes-cycle/${uuid}/refuser`, { note }),
}
