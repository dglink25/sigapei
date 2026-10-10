const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const FORMAT_DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formaterDate(valeur) {
  return valeur ? FORMAT_DATE.format(new Date(valeur)) : '—'
}

export function formaterDateHeure(valeur) {
  return valeur ? FORMAT_DATE_HEURE.format(new Date(valeur)) : '—'
}

export function formaterNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  return Number(valeur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

/** UUID tronqué pour l'affichage compact (identifiants externes). */
export function uuidCourt(valeur) {
  if (!valeur) return '—'
  const texte = String(valeur)
  return texte.length > 12 ? `${texte.slice(0, 8)}…` : texte
}

export function estDatePassee(valeur) {
  return Boolean(valeur) && new Date(valeur) < new Date()
}
