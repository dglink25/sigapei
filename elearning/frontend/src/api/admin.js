import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

export function useStatistiques(options = {}) {
  return useQuery({
    queryKey: ['statistiques'],
    queryFn: async () => (await api.get('/statistiques/')).data,
    ...options,
  })
}

export function useStatistiquesConsolidees(options = {}) {
  return useQuery({
    queryKey: ['statistiques-consolidees'],
    queryFn: async () => (await api.get('/statistiques/consolidees/')).data,
    ...options,
  })
}

export function useActiviteApprenant(uuid, options = {}) {
  return useQuery({
    queryKey: ['activite-apprenant', uuid],
    queryFn: async () =>
      (await api.get(`/apprenants/${uuid}/activite/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

export function useParametres(options = {}) {
  return useQuery({
    queryKey: ['parametres'],
    queryFn: async () => (await api.get('/parametres/')).data,
    ...options,
  })
}

export function useMajParametres() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.put('/parametres/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Paramètres du module enregistrés.')
      client.invalidateQueries({ queryKey: ['parametres'] })
    },
  })
}
