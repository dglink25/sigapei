import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['devoirs']
const CLE_SOUMISSIONS = ['soumissions']

export function useDevoirsListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/devoirs/', { params })).data,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useDevoir(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'detail', uuid],
    queryFn: async () => (await api.get(`/devoirs/${uuid}/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

/** Statistiques d'un devoir (moyennes, distribution des notes) :
 * fournies par l'action backend /devoirs/{uuid}/statistiques/. */
export function useDevoirStatistiques(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'statistiques', uuid],
    queryFn: async () =>
      (await api.get(`/devoirs/${uuid}/statistiques/`)).data,
    enabled: Boolean(uuid),
    retry: false,
    ...options,
  })
}

export function useCreationDevoir() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post('/devoirs/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Devoir créé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useMajDevoir() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, donnees }) =>
      (await api.patch(`/devoirs/${uuid}/`, donnees)).data,
    onSuccess: (devoir) => {
      notifierSucces('Devoir mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', devoir.uuid] })
    },
  })
}

export function useSoumissionsDevoir(uuidDevoir, params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE_SOUMISSIONS, 'devoir', uuidDevoir, params],
    queryFn: async () =>
      (await api.get(`/devoirs/${uuidDevoir}/soumissions/`, { params })).data,
    enabled: Boolean(uuidDevoir),
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useDeposerSoumission(uuidDevoir) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post(`/devoirs/${uuidDevoir}/soumissions/`, donnees)).data,
    onSuccess: () => {
      notifierSucces('Soumission déposée.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: CLE_SOUMISSIONS })
    },
  })
}

export function useNoterSoumission() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, note, commentaire }) =>
      (await api.patch(`/soumissions/${uuid}/note/`, { note, commentaire }))
        .data,
    onSuccess: () => {
      notifierSucces('Note enregistrée.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: CLE_SOUMISSIONS })
    },
  })
}

export function useReporterSoumission() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/soumissions/${uuid}/reporter/`)).data,
    onSuccess: () => {
      notifierSucces('Note reportée vers evaluations.notes.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: CLE_SOUMISSIONS })
    },
  })
}
