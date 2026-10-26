import { ENV } from '../../config/commun/env'
import { ApiError, buildError } from '../commun/http'
import { API_BASE, DOC_TYPES } from '../../config/etablissements/config'

export function validateFile(type, file) {
  const rule = DOC_TYPES[type]
  const ext = file.name.split('.').pop().toLowerCase()
  if (!rule.mimes.includes(file.type) && !rule.exts.includes(ext)) return `Format non accepté. Formats autorisés : ${rule.formats}.`
  if (file.size > rule.maxMo * 1024 * 1024) return `Fichier trop volumineux (maximum ${rule.maxMo} Mo).`
  return ''
}

export const formatSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`)

/** Televersement multipart avec progression (fetch ne sait pas suivre l'envoi). */
export function uploadDocument({ demandeUuid, type, file, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}${ENV.apiPrefix}/demandes/${demandeUuid}/documents`)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.timeout = 120000
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data
      try { data = JSON.parse(xhr.responseText) } catch { data = null }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(buildError(xhr.status, data))
    }
    xhr.onerror = () => reject(new ApiError({ kind: 'network', title: 'Service injoignable', message: 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.' }))
    xhr.ontimeout = () => reject(new ApiError({ kind: 'timeout', title: 'Délai dépassé', message: 'Le téléversement a pris trop de temps. Vérifiez votre connexion et réessayez.' }))
    const fd = new FormData()
    fd.append('type', type)
    fd.append('fichier', file)
    xhr.send(fd)
  })
}
