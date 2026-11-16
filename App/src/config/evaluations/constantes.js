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




/** Année scolaire courante au format 2026-2027 (bascule en août). */
export const anneeScolaireCourante = () => {
  const d = new Date()
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `${debut}-${debut + 1}`
}
