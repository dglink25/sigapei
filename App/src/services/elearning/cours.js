import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { useNotify } from '../../context/commun/NotifyContext'

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
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post('/cours/', donnees)).data,
    onSuccess: () => {
      notify.success('Cours créé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useMajCours() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, donnees }) =>
      (await api.patch(`/cours/${uuid}/`, donnees)).data,
    onSuccess: (cours) => {
      notify.success('Cours mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', cours.uuid] })
    },
  })
}

export function useArchiverCours() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/cours/${uuid}/archiver/`)).data,
    onSuccess: (cours) => {
      notify.success('Cours archivé (aucune suppression physique).')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', cours.uuid] })
    },
  })
}

export function useAjouterLecon() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidCours, donnees }) =>
      (await api.post(`/cours/${uuidCours}/lecons/`, donnees)).data,
    onSuccess: () => {
      notify.success('Leçon ajoutée.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useReordonnerLecons() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidCours, reordonner }) =>
      (await api.post(`/cours/${uuidCours}/lecons/`, { reordonner })).data,
    onSuccess: () => {
      notify.success('Ordre des leçons mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
