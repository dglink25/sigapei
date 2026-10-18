import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['quiz']
const CLE_TENTATIVES = ['tentatives']

export function useQuizListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/quiz/', { params })).data,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useQuiz(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'detail', uuid],
    queryFn: async () => (await api.get(`/quiz/${uuid}/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

export function useCreationQuiz() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) => (await api.post('/quiz/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Quiz créé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useMajQuiz() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, donnees }) =>
      (await api.patch(`/quiz/${uuid}/`, donnees)).data,
    onSuccess: (quiz) => {
      notifierSucces('Quiz mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', quiz.uuid] })
    },
  })
}

export function useAjouterQuestion(uuidQuiz) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post(`/quiz/${uuidQuiz}/questions/`, donnees)).data,
    onSuccess: () => {
      notifierSucces('Question ajoutée.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useDemarrerTentative(uuidQuiz) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ apprenant_id, soumis_par }) =>
      (
        await api.post(`/quiz/${uuidQuiz}/tentatives/`, {
          apprenant_id,
          soumis_par,
        })
      ).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useTentative(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE_TENTATIVES, 'detail', uuid],
    queryFn: async () => (await api.get(`/tentatives/${uuid}/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

export function useSoumettreTentative() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidTentative, reponses }) =>
      (
        await api.post(`/tentatives/${uuidTentative}/soumettre/`, {
          reponses,
        })
      ).data,
    onSuccess: () => {
      notifierSucces('Réponses soumises.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useNoterReponse() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, noteFinale }) =>
      (await api.patch(`/reponses/${uuid}/note/`, { note_finale: noteFinale }))
        .data,
    onSuccess: () => {
      notifierSucces('Note ajustée et validée.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useValiderTentative() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/tentatives/${uuid}/valider/`)).data,
    onSuccess: () => {
      notifierSucces('Tentative validée.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useReporterTentative() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/tentatives/${uuid}/reporter/`)).data,
    onSuccess: () => {
      notifierSucces('Note du quiz reportée vers evaluations.notes.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}
