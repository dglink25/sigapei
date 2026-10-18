import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { useNotify } from '../../context/commun/NotifyContext'

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
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) => (await api.post('/quiz/', donnees)).data,
    onSuccess: () => {
      notify.success('Quiz créé.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

export function useMajQuiz() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, donnees }) =>
      (await api.patch(`/quiz/${uuid}/`, donnees)).data,
    onSuccess: (quiz) => {
      notify.success('Quiz mis à jour.')
      client.invalidateQueries({ queryKey: CLE })
      client.invalidateQueries({ queryKey: [...CLE, 'detail', quiz.uuid] })
    },
  })
}

export function useAjouterQuestion(uuidQuiz) {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.post(`/quiz/${uuidQuiz}/questions/`, donnees)).data,
    onSuccess: () => {
      notify.success('Question ajoutée.')
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
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuidTentative, reponses }) =>
      (
        await api.post(`/tentatives/${uuidTentative}/soumettre/`, {
          reponses,
        })
      ).data,
    onSuccess: () => {
      notify.success('Réponses soumises.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useNoterReponse() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, noteFinale }) =>
      (await api.patch(`/reponses/${uuid}/note/`, { note_finale: noteFinale }))
        .data,
    onSuccess: () => {
      notify.success('Note ajustée et validée.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useValiderTentative() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/tentatives/${uuid}/valider/`)).data,
    onSuccess: () => {
      notify.success('Tentative validée.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}

export function useReporterTentative() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (uuid) =>
      (await api.post(`/tentatives/${uuid}/reporter/`)).data,
    onSuccess: () => {
      notify.success('Note du quiz reportée vers evaluations.notes.')
      client.invalidateQueries({ queryKey: CLE_TENTATIVES })
    },
  })
}
