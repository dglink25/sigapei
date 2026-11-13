import { useQuery } from '@tanstack/react-query'

import { api } from './client.js'

/**
 * GET /v1/apprenants/{uuid}/dossier-vie-scolaire - vue consolidée
 * (présences récentes, synthèse d'absences, incidents) d'un apprenant.
 */
export function useDossierVieScolaire(apprenantUuid, options = {}) {
  return useQuery({
    queryKey: ['dossier-vie-scolaire', apprenantUuid],
    queryFn: async () =>
      (await api.get(`/apprenants/${apprenantUuid}/dossier-vie-scolaire`)).data
        .dossier,
    enabled: Boolean(apprenantUuid),
    ...options,
  })
}
