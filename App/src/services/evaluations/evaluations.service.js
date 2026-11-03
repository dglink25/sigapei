/**
 * Microservice Évaluations (port 4006) : appel direct avec le jeton Identité (Authorization: Bearer),
 * vérifié par le service auprès d'Identité. Aucun en-tête de rôle ou d'établissement n'a de valeur côté serveur.
 */
import { ENV } from '../../config/commun/env'
import { createHttp } from '../../lib/commun/http'

const BASE = ENV.services.evaluation || 'http://localhost:4006'
const http = createHttp(BASE)

const qs = (params = {}) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** Réponse simple : la donnée ; réponse paginée : { elements, meta }. */
const donnee = (r) => r?.data ?? null
const page = (r) => ({ elements: Array.isArray(r?.data) ? r.data : [], meta: r?.meta ?? null })

export const evaluationsService = {
  /* Contexte de l'utilisateur */
  mesAffectations: async () => donnee(await http.get('/mes-affectations')) ?? [],
  mesApprenants: async () => donnee(await http.get('/mes-apprenants')) ?? [],

  /* Matières et coefficients */
  matieres: async ({ actives = true, page: p = 1, par_page = 100 } = {}) =>
    page(await http.get(`/matieres${qs({ actives: actives ? 1 : 0, page: p, par_page })}`)),
  creerMatiere: async (corps) => donnee(await http.post('/matieres', corps)),
  modifierMatiere: async (uuid, corps) => donnee(await http.put(`/matieres/${uuid}`, corps)),
  coefficients: async (uuid, coefficients) => donnee(await http.put(`/matieres/${uuid}/coefficients`, { coefficients })),

  /* Périodes */
  periodes: async (filtres = {}) => page(await http.get(`/periodes${qs({ par_page: 100, ...filtres })}`)),
  creerPeriode: async (corps) => donnee(await http.post('/periodes', corps)),
  cloturerPeriode: async (uuid) => donnee(await http.post(`/periodes/${uuid}/cloturer`)),

  /* Barèmes, règles de notation, modèles de bulletin */
  grilles: async (cycle) => donnee(await http.get(`/grilles${qs({ cycle })}`)) ?? [],
  creerGrille: async (corps) => donnee(await http.post('/grilles', corps)),
  regles: async (cycle) => donnee(await http.get(`/parametres-notation/${cycle}`)),
  enregistrerRegles: async (cycle, corps) => donnee(await http.put(`/parametres-notation/${cycle}`, corps)),
  modeleBulletin: async (cycle) => donnee(await http.get(`/modeles-bulletin/${cycle}`)),
  enregistrerModele: async (corps) => donnee(await http.post('/modeles-bulletin', corps)),

  /* Évaluations et notes */
  evaluations: async (filtres) => page(await http.get(`/evaluations${qs({ par_page: 100, ...filtres })}`)),
  creerEvaluation: async (corps) => donnee(await http.post('/evaluations', corps)),
  verrouiller: async (uuid) => donnee(await http.post(`/evaluations/${uuid}/verrouiller`)),
  grilleNotes: async (classeUuid, filtres) => donnee(await http.get(`/notes/classe/${classeUuid}${qs(filtres)}`)),
  saisirNotes: async (evaluationUuid, notes) => donnee(await http.post('/notes', { evaluation_uuid: evaluationUuid, notes })),
  corrigerNote: async (uuid, corps) => donnee(await http.put(`/notes/${uuid}/corriger`, corps)),

  /* Bulletins et classements */
  bulletin: async (apprenantUuid, periodeUuid) =>
    donnee(await http.get(`/bulletins/apprenant/${apprenantUuid}${qs({ periode_uuid: periodeUuid })}`)),
  classement: async (classeUuid, periodeUuid) =>
    donnee(await http.get(`/classements/classe/${classeUuid}${qs({ periode_uuid: periodeUuid })}`)),
  /** Lien signé (5 min) puis téléchargement par le navigateur : le PDF ne transite pas par la mémoire de la page. */
  telechargerBulletin: async (apprenantUuid, periodeUuid) => {
    const d = donnee(await http.get(`/bulletins/apprenant/${apprenantUuid}/pdf${qs({ periode_uuid: periodeUuid })}`))
    if (!d?.url || !d.url.startsWith('/')) throw new Error('Lien de téléchargement invalide.')
    const a = document.createElement('a')
    a.href = `${BASE}${d.url}`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return d
  },

  /* Contestations */
  contestations: async (filtres = {}) => page(await http.get(`/contestations${qs(filtres)}`)),
  contester: async (noteUuid, motif) => donnee(await http.post('/contestations', { note_uuid: noteUuid, motif })),
  traiterContestation: async (uuid, corps) => donnee(await http.put(`/contestations/${uuid}/traiter`, corps)),
}
