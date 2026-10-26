import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { useNotify } from '../../context/commun/NotifyContext'
import { useProfilStore } from '../../context/elearning/profil.js'

export function useStatistiques(options = {}) {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  return useQuery({
    queryKey: ['statistiques'],
    queryFn: async () => (await api.get('/statistiques/')).data,
    enabled: Boolean(tenantId),
    ...options,
  })
}

export function useStatistiquesConsolidees(options = {}) {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  return useQuery({
    queryKey: ['statistiques-consolidees'],
    queryFn: async () => (await api.get('/statistiques/consolidees/')).data,
    enabled: Boolean(tenantId),
    ...options,
  })
}

export function useActiviteApprenant(uuid, options = {}) {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  return useQuery({
    queryKey: ['activite-apprenant', uuid],
    queryFn: async () =>
      (await api.get(`/apprenants/${uuid}/activite/`)).data,
    enabled: Boolean(tenantId && uuid),
    ...options,
  })
}

export function useParametres(options = {}) {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  return useQuery({
    queryKey: ['parametres'],
    queryFn: async () => (await api.get('/parametres/')).data,
    enabled: Boolean(tenantId),
    ...options,
  })
}

export function useMajParametres() {
  const notify = useNotify()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) =>
      (await api.put('/parametres/', donnees)).data,
    onSuccess: () => {
      notify.success('Paramètres du module enregistrés.')
      client.invalidateQueries({ queryKey: ['parametres'] })
    },
  })
}
