import { badgeIncident, badgePresence } from '../utils/libelles.js'

// Ce fichier n'exporte que des composants (règle react-refresh) : les libellés
// et classes partagés vivent dans utils/libelles.js.

export function BadgeStatutPresence({ valeur }) {
  if (!valeur) return null
  const { libelle, classe } = badgePresence(valeur)
  return <span className={`badge ${classe}`}>{libelle}</span>
}

export function BadgeTypeIncident({ valeur }) {
  if (!valeur) return null
  const { libelle, classe } = badgeIncident(valeur)
  return <span className={`badge ${classe}`}>{libelle}</span>
}
