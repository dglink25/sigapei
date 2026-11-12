import { createHttp } from '../../lib/commun/http'
import { PAIEMENT_API_BASE, MESSAGES_ERREUR_PAIEMENT } from '../../config/paiements/config'

const api = createHttp(PAIEMENT_API_BASE)

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
    const m = err?.code ? MESSAGES_ERREUR_PAIEMENT[err.code] : null
    if (m) err.message = m
    throw err
  }
}

/** ─── Super Admin : Agrégateurs ─── */
export const agregateurService = {
  lister: () => appel(api.get('/admin/paiements/agregateurs')),
  modifier: (uuid, body) => appel(api.patch(`/admin/paiements/agregateurs/${uuid}`, body)),
}

/** ─── Super Admin : Modes de paiement ─── */
export const modePaiementService = {
  lister: (params = {}) => appel(api.get(`/admin/paiements/modes-paiement${qs(params)}`)),
  creer: (body) => appel(api.post('/admin/paiements/modes-paiement', body)),
  modifier: (uuid, body) => appel(api.patch(`/admin/paiements/modes-paiement/${uuid}`, body)),
}

/** ─── Super Admin : Accords établissements ─── */
export const accordService = {
  lister: (params = {}) => appel(api.get(`/admin/paiements/accords${qs(params)}`)),
  accorder: (body) => appel(api.post('/admin/paiements/accords', body)),
  modifierStatut: (uuid, statut, motif) => appel(api.patch(`/admin/paiements/accords/${uuid}/statut`, { statut, motif })),
}

/** ─── Super Admin : Paramètres plateforme ─── */
export const parametresPlatformeService = {
  lister: () => appel(api.get('/admin/paiements/parametres-plateforme')),
  modifier: (devise, body) => appel(api.patch(`/admin/paiements/parametres-plateforme/${devise}`, body)),
}

/** ─── Super Admin : Interrupteurs ─── */
export const interrupteurService = {
  lister: () => appel(api.get('/admin/paiements/interrupteurs')),
  activer: (body) => appel(api.post('/admin/paiements/interrupteurs', body)),
  desactiver: (uuid) => appel(api.delete(`/admin/paiements/interrupteurs/${uuid}`)),
}

/** ─── Super Admin : Stats & Audit ─── */
export const paiementAdminService = {
  stats: () => appel(api.get('/admin/paiements/stats')),
  devises: () => appel(api.get('/admin/paiements/devises')),
  audit: (params = {}) => appel(api.get(`/admin/paiements/audit${qs(params)}`)),
}
