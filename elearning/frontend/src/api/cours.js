import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['cours']

export function useCoursListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/cours/', { params })).data,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useCours(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'detail', uuid],
    queryFn: async () => (await api.get(`/cours/${uuid}/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

export function useCreationCours() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post('/cours/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Cours créé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useMajCours() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, donnees }) =>
      (await api.patch(`/cours/${uuid}/`, donnees)).data,
    onSuccess: (cours) => {
      notifierSucces('Cours mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', cours.uuid] })
    },
  })
}

export function useArchiverCours() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/cours/${uuid}/archiver/`)).data,
    onSuccess: (cours) => {
      notifierSucces('Cours archivé (aucune suppression physique).')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', cours.uuid] })
    },
  })
}

export function useAjouterLecon() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidCours, donnees }) =>
      (await api.post(`/cours/${uuidCours}/lecons/`, donnees)).data,
    onSuccess: () => {
      notifierSucces('Leçon ajoutée.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useReordonnerLecons() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidCours, reordonner }) =>
      (await api.post(`/cours/${uuidCours}/lecons/`, { reordonner })).data,
    onSuccess: () => {
      notifierSucces('Ordre des leçons mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
