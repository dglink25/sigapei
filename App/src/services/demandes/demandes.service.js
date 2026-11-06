/**
 * Microservice Demandes administratives (port 4007) : appel direct avec le jeton Identité (Bearer),
 * vérifié par le service. Les droits de gestion viennent de la grille de l'établissement (gouvernance).
 */
import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'
import { ouvrirLienSigne } from '../../components/modules/outils'

const BASE = ENV.services.demande || 'http://localhost:4007'
const http = createHttp(BASE)

const qs = (params = {}) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}
const donnee = (r) => r?.data ?? null
/** Liste paginée du service : { elements, pagination } -> { elements, meta }. */
const page = (r) => ({ elements: r?.data?.elements ?? [], meta: r?.data?.pagination ?? null })

export const demandesService = {
  mesActions: async () => donnee(await http.get('/gouvernance/mes-actions')),
  mesApprenants: async () => donnee(await http.get('/mes-apprenants')) ?? [],

  /* Types de documents */
  types: async (tous = false) => donnee(await http.get(`/types-document${tous ? '?tous=1' : ''}`)) ?? [],
  creerType: async (corps) => donnee(await http.post('/types-document', corps)),
  modifierType: async (uuid, corps) => donnee(await http.patch(`/types-document/${uuid}`, corps)),
  initialiserTypes: async () => http.post('/types-document/initialiser'),

  /* Demandes de documents */
  soumettre: async (corps) => http.post('/demandes', corps),
  mesDemandes: async (f) => page(await http.get(`/demandes/mes-demandes${qs({ par_page: 20, ...f })}`)),
  file: async (f) => page(await http.get(`/demandes${qs({ par_page: 20, ...f })}`)),
  demande: async (uuid) => donnee(await http.get(`/demandes/${uuid}`)),
  resoumettre: async (uuid) => donnee(await http.post(`/demandes/${uuid}/resoumettre`)),
  annuler: async (uuid) => donnee(await http.post(`/demandes/${uuid}/annuler`)),
  traiter: async (uuid, corps = {}) => donnee(await http.put(`/demandes/${uuid}/traiter`, corps)),
  rejeter: async (uuid, motif) => donnee(await http.put(`/demandes/${uuid}/rejeter`, { motif })),
  deroger: async (uuid, motif) => donnee(await http.put(`/demandes/${uuid}/derogation`, { motif })),
  prioriser: async (uuid, priorite) => donnee(await http.put(`/demandes/${uuid}/priorite`, { priorite })),
  telecharger: async (uuid) => ouvrirLienSigne(BASE, donnee(await http.get(`/demandes/${uuid}/document`))?.url),

  /* Permissions d'absence */
  soumettrePermission: async (corps) => donnee(await http.post('/permissions-absence', corps)),
  mesPermissions: async (f) => page(await http.get(`/permissions-absence/mes-demandes${qs({ par_page: 20, ...f })}`)),
  permissions: async (f) => page(await http.get(`/permissions-absence${qs({ par_page: 20, ...f })}`)),
  deciderPermission: async (uuid, corps) => donnee(await http.put(`/permissions-absence/${uuid}/decision`, corps)),
  annulerPermission: async (uuid) => donnee(await http.post(`/permissions-absence/${uuid}/annuler`)),

  /* Réclamations */
  ouvrirReclamation: async (corps) => donnee(await http.post('/reclamations', corps)),
  mesReclamations: async (f) => page(await http.get(`/reclamations/mes-reclamations${qs({ par_page: 20, ...f })}`)),
  reclamationsRecues: async (f) => page(await http.get(`/reclamations${qs({ par_page: 20, ...f })}`)),
  reclamation: async (uuid) => donnee(await http.get(`/reclamations/${uuid}`)),
  repondre: async (uuid, contenu) => donnee(await http.post(`/reclamations/${uuid}/messages`, { contenu })),
  statutReclamation: async (uuid, statut) => donnee(await http.put(`/reclamations/${uuid}/statut`, { statut })),

  /* Pilotage */
  statistiques: async () => donnee(await http.get('/statistiques')),
  grille: async () => {
    const g = donnee(await http.get('/gouvernance/permissions'))
    return {
      actions: g?.actions ?? [],
      roles: Object.fromEntries((g?.roles ?? []).map((r) => [r.role_code, r.permissions.map((p) => p.action)])),
      perimetres: Object.fromEntries((g?.roles ?? []).map((r) => [r.role_code, Object.fromEntries(r.permissions.map((p) => [p.action, p.perimetre]))])),
    }
  },
  /** Remplace les actions du rôle en conservant le périmètre déjà défini (catégories de réclamations). */
  definirDroits: async (roleCode, actions, perimetres = {}) => donnee(await http.put(`/gouvernance/permissions/${roleCode}`, {
    permissions: actions.map((action) => (perimetres[action] ? { action, perimetre: perimetres[action] } : { action })),
  })),
}
