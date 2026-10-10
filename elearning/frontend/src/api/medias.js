import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client.js'
import { notifierSucces } from '../stores/toasts.js'

const CLE = ['medias']

export function useMediasListe(params = {}, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'liste', params],
    queryFn: async () => (await api.get('/medias/', { params })).data,
    placeholderData: (precedent) => precedent,
    ...options,
  })
}

export function useMedia(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'detail', uuid],
    queryFn: async () => (await api.get(`/medias/${uuid}/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}

export function useCreationMedia() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (donnees) => (await api.post('/medias/', donnees)).data,
    onSuccess: () => {
      notifierSucces('Média enregistré.')
      client.invalidateQueries({ queryKey: CLE })
    },
  })
}

/**
 * Upload direct vers Cloudinary avec la signature fournie par le backend
 * (POST /v1/medias/signature-upload/). Règle du cahier des charges : le
 * fichier ne transite jamais par le backend E-learning.
 */
export async function televerserVersCloudinary(signature, fichier) {
  const corps = new FormData()
  corps.append('file', fichier)
  corps.append('api_key', signature.api_key)
  corps.append('timestamp', signature.timestamp)
  corps.append('folder', signature.folder)
  corps.append('signature', signature.signature)
  const reponse = await axios.post(signature.url_upload, corps)
  return reponse.data
}

/** Déduit le type de média (enum backend) du type MIME du fichier. */
export function typeMediaDepuisFichier(fichier) {
  const mime = String(fichier?.type || '')
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  return 'document'
}

/**
 * Flux complet : signature → upload direct Cloudinary → enregistrement de
 * la référence dans /v1/medias/. Renvoie le média créé.
 */
export async function creerMediaParUpload(fichier, dossier = 'elearning') {
  const signature = (
    await api.post('/medias/signature-upload/', { dossier })
  ).data
  const resultat = await televerserVersCloudinary(signature, fichier)
  return (
    await api.post('/medias/', {
      type: typeMediaDepuisFichier(fichier),
      nom_fichier: fichier.name,
      url_cloudinary: resultat.secure_url,
      public_id_cloudinary: resultat.public_id,
    })
  ).data
}

export function useUrlSignee(uuid, options = {}) {
  return useQuery({
    queryKey: [...CLE, 'url-signee', uuid],
    queryFn: async () => (await api.get(`/medias/${uuid}/url-signee/`)).data,
    enabled: Boolean(uuid),
    ...options,
  })
}
