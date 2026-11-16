import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['incidents']

/** GET /v1/incidents - liste filtrable par classe, apprenant ou type. */
export function useIncidentsListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/incidents', { params })).data.incidents,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

/**
 * POST /v1/incidents - signale un incident disciplinaire.
 * @param {{apprenant_uuid: string, type: string, description: string}} donnees
 */
export function useSignalerIncident() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) => (await api.post('/incidents', donnees)).data.incident,
    onSuccess: () => {
      notifierSucces('Incident signalé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

/**
 * POST /v1/incidents/{uuid}/sanction - associe une sanction à un incident.
 * Une sanction ne peut jamais exister sans incident (règle de gestion).
 */
export function useAppliquerSanction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, sanction }) =>
      (await api.post(`/incidents/${uuid}/sanction`, { sanction })).data.incident,
    onSuccess: () => {
      notifierSucces('Sanction appliquée.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
