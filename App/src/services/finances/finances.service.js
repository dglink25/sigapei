/**
 * Microservice Finances (port 4008) : appel direct avec le jeton Identité (Bearer), vérifié par le service.
 * Aucun moyen de paiement n'est manipulé ici : le paiement en ligne se fait sur la page sécurisée de l'agrégateur.
 */
import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'
import { ouvrirLienSigne } from '../../components/modules/outils'

const BASE = ENV.services.finance || 'http://localhost:4008'
const http = createHttp(BASE)

const qs = (params = {}) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v === true ? 1 : v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}
const donnee = (r) => r?.data ?? null
/** Liste paginée du service : { elements, pagination } -> { elements, meta }. */
const page = (r) => ({ elements: r?.data?.elements ?? [], meta: r?.data?.pagination ?? null })

export const financesService = {
  mesDroits: async () => donnee(await http.get('/mes-droits')),
  mesFinances: async () => donnee(await http.get('/mes-finances')) ?? [],

  /* Formules tarifaires */
  formules: async (f = {}) => page(await http.get(`/formules${qs({ par_page: 100, ...f })}`)),
  formulesApplicables: async (apprenantUuid, annee) => donnee(await http.get(`/formules/applicables${qs({ apprenant_uuid: apprenantUuid, annee_scolaire: annee })}`)) ?? [],
  creerFormule: async (corps) => donnee(await http.post('/formules', corps)),
  modifierFormule: async (uuid, corps) => donnee(await http.patch(`/formules/${uuid}`, corps)),

  /* Factures */
  apprenantsDeClasse: async (classeUuid) => donnee(await http.get(`/classes/${classeUuid}/apprenants`)) ?? [],
  factures: async (f) => page(await http.get(`/factures${qs({ par_page: 20, ...f })}`)),
  facture: async (uuid) => donnee(await http.get(`/factures/${uuid}`)),
  emettre: async (corps) => http.post('/factures', corps),
  emettrePourClasse: async (corps) => http.post('/factures/classe', corps),
  annuler: async (uuid, motif) => donnee(await http.post(`/factures/${uuid}/annuler`, { motif })),
  telechargerFacture: async (uuid) => ouvrirLienSigne(BASE, donnee(await http.get(`/factures/${uuid}/pdf`))?.url),

  /* Paiement en ligne */
  paiements: async (factureUuid) => donnee(await http.get(`/factures/${factureUuid}/paiements`)) ?? [],
  payer: async (factureUuid, montant, urlRetour) => donnee(await http.post(`/factures/${factureUuid}/paiements`, { montant, url_retour: urlRetour })),
  paiement: async (uuid) => donnee(await http.get(`/paiements/${uuid}`)),

  /* Règlements */
  reglements: async (f) => page(await http.get(`/reglements${qs({ par_page: 20, ...f })}`)),
  saisir: async (factureUuid, corps) => http.post(`/factures/${factureUuid}/reglements`, corps),
  valider: async (uuid) => donnee(await http.post(`/reglements/${uuid}/valider`)),
  rejeter: async (uuid, motif) => donnee(await http.post(`/reglements/${uuid}/rejeter`, { motif })),
  telechargerRecu: async (uuid) => ouvrirLienSigne(BASE, donnee(await http.get(`/reglements/${uuid}/recu`))?.url),

  /* Pilotage */
  synthese: async (du, au) => donnee(await http.get(`/rapports/synthese${qs({ du, au })}`)),
  parametres: async () => donnee(await http.get('/parametres')),
  enregistrerParametres: async (corps) => donnee(await http.put('/parametres', corps)),
  grille: async () => {
    const g = donnee(await http.get('/gouvernance'))
    return { actions: g?.actions ?? [], roles: Object.fromEntries((g?.roles ?? []).map((r) => [r.role_code, r.actions])) }
  },
  definirDroits: async (roleCode, actions) => donnee(await http.put(`/gouvernance/${roleCode}`, { actions })),
}
