import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { useNotify } from '../../context/commun/NotifyContext'

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
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post('/ressources/', donnees)).data,
    onSuccess: () => {
      notify.success('Ressource déposée en bibliothèque.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
