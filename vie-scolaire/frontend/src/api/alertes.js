import { useQuery } from '@tanstack/react-query'

import { api } from './client.js'

/**
 * GET /v1/interne/alertes-absences - apprenants ayant dépassé le seuil
 * d'absences sur la période glissante (back-office du censeur).
 *
 * Règle n°3 : cet endpoint est réservé aux appels internes. En développement,
 * le proxy Vite injecte l'en-tête X-Internal-Secret côté serveur (variable
 * INTERNAL_API_SECRET) : il ne transite jamais par le navigateur.
 */
export function useAlertesAbsences(options = {}) {
  return useQuery({
    queryKey: ['alertes-absences'],
    queryFn: async () => (await api.get('/interne/alertes-absences')).data.alertes,
    ...options,
  })
}
