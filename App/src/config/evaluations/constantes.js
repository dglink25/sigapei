/** Libellés et règles d'affichage du module Évaluations (mêmes valeurs que le microservice). */

export const CYCLES = [
  { code: 'primaire', libelle: 'Primaire' },
  { code: 'secondaire', libelle: 'Secondaire' },
  { code: 'universitaire', libelle: 'Universitaire' },
]
export const libelleCycle = (c) => CYCLES.find((x) => x.code === c)?.libelle ?? c ?? '-'

export const TYPES_EVALUATION = [
  { code: 'interrogation', libelle: 'Interrogation' },
  { code: 'devoir_surveille', libelle: 'Devoir surveillé' },
  { code: 'composition', libelle: 'Composition' },
  { code: 'examen_officiel', libelle: 'Examen officiel' },
  { code: 'evaluation_competence', libelle: 'Évaluation de compétences' },
]
const TOUS_TYPES = [...TYPES_EVALUATION, { code: 'note_elearning', libelle: 'Note E-learning' }, { code: 'composition_en_ligne', libelle: 'Composition en ligne' }]
export const libelleType = (t) => TOUS_TYPES.find((x) => x.code === t)?.libelle ?? t ?? '-'

export const STATUTS_NOTE = [
  { code: 'saisie', libelle: 'Note', court: '' },
  { code: 'absent_justifie', libelle: 'Absent justifié', court: 'AJ' },
  { code: 'absent_non_justifie', libelle: 'Absent non justifié', court: 'ANJ' },
  { code: 'dispense', libelle: 'Dispensé', court: 'D' },
]

export const STATUTS_PERIODE = {
  ouverte: { libelle: 'Ouverte', badge: 'success' },
  en_cloture: { libelle: 'Clôture en cours', badge: 'warning' },
  cloturee: { libelle: 'Clôturée', badge: 'neutral' },
}

export const STATUTS_CONTESTATION = {
  ouverte: { libelle: 'Ouverte', badge: 'warning' },
  en_examen: { libelle: 'En examen', badge: 'info' },
  resolue: { libelle: 'Résolue', badge: 'success' },
  rejetee: { libelle: 'Rejetée', badge: 'danger' },
}

export const COLONNES_BULLETIN = [
  { code: 'matiere', libelle: 'Matière' },
  { code: 'coefficient', libelle: 'Coefficient' },
  { code: 'notes', libelle: 'Notes' },
  { code: 'moyenne', libelle: 'Moyenne' },
  { code: 'moyenne_classe', libelle: 'Moyenne de la classe' },
  { code: 'min_classe', libelle: 'Note minimale de la classe' },
  { code: 'max_classe', libelle: 'Note maximale de la classe' },
  { code: 'rang', libelle: 'Rang' },
  { code: 'appreciation', libelle: 'Appréciation' },
]


/** « 12.50 » -> « 12,5 » ; valeur absente -> « - ». */
export const formatNombre = (v) => {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Année scolaire courante au format 2026-2027 (bascule en août). */
export const anneeScolaireCourante = () => {
  const d = new Date()
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `${debut}-${debut + 1}`
}

export const nomComplet = (a) => [a?.nom, a?.prenom].filter(Boolean).join(' ') || a?.matricule || '-'
