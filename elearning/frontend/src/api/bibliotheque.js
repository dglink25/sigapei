import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['ressources']

export function useRessourcesListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/ressources/', { params })).data,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useCreationRessource() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post('/ressources/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Ressource déposée en bibliothèque.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
