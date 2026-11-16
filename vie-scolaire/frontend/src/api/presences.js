import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['presences']

/** GET /v1/presences - liste filtrable (classe, apprenant, cours, statut, période). */
export function usePresencesListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/presences', { params })).data.presences,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

/** GET /v1/apprenants/{uuid}/absences/synthese - totaux sur la période glissante. */
export function useSyntheseAbsences(apprenantUuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'synthese', apprenantUuid],
    queryFn: async () =>
      (await api.get(`/apprenants/${apprenantUuid}/absences/synthese`)).data
        .synthese,
    enabled: Boolean(apprenantUuid),
    ...options,
  })
}

/**
 * POST /v1/presences - enregistre les présences d'un cours pour une classe.
 * @param {{cours_uuid: string, date: string, apprenants: Array<{uuid: string, statut: string}>}} donnees
 */
export function useEnregistrerPresences() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) => (await api.post('/presences', donnees)).data,
    onSuccess: () => {
      notifierSucces('Présences enregistrées.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

/**
 * PUT /v1/presences/{uuid} - correction d'une présence (fenêtre enseignant,
 * sinon censeur/administrateur). Le CAPTCHA est exigé (jeton du profil).
 */
export function useCorrigerPresence() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ uuid, statut, motif }) =>
      (await api.put(`/presences/${uuid}`, { statut, motif })).data.presence,
    onSuccess: () => {
      notifierSucces('Présence corrigée.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}
