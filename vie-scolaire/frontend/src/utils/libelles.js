// Libellés et classes de badges métier Vie scolaire (partagés).

const CLASSES_PRESENCE = {
  present: { libelle: 'Présent', classe: 'badge-publie' },
  absent: { libelle: 'Absent', classe: 'badge-retard' },
  retard: { libelle: 'Retard', classe: 'badge-soumis' },
}

const CLASSES_INCIDENT = {
  retard: { libelle: 'Retard', classe: 'badge-soumis' },
  comportement: { libelle: 'Comportement', classe: 'badge-differee' },
  absence_non_justifiee_repetee: {
    libelle: 'Absences répétées',
    classe: 'badge-retard',
  },
  autre: { libelle: 'Autre', classe: 'badge-texte' },
}

export const TYPES_INCIDENT = Object.keys(CLASSES_INCIDENT)
export const STATUTS_PRESENCE = Object.keys(CLASSES_PRESENCE)

export function badgePresence(valeur) {
  return CLASSES_PRESENCE[valeur] ?? { libelle: valeur, classe: 'badge-texte' }
}

export function badgeIncident(valeur) {
  return CLASSES_INCIDENT[valeur] ?? { libelle: valeur, classe: 'badge-texte' }
}

export function libelleTypeIncident(valeur) {
  return CLASSES_INCIDENT[valeur]?.libelle ?? valeur ?? '-'
}

export function libelleStatutPresence(valeur) {
  return CLASSES_PRESENCE[valeur]?.libelle ?? valeur ?? '-'
}
