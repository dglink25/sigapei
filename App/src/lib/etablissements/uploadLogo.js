import { ENV } from '../../config/commun/env'
import { ApiError, buildError, refreshSession } from '../commun/http'
import { ADMIN_BASE } from '../../config/etablissements/config'
import { tokenStore, decodeJwt } from '../identite/tokenStore'

/** Extrait roleCode et tenantId du JWT courant pour les headers de contexte. */
function headersContexte() {
  const payload = decodeJwt(tokenStore.getAccess() ?? '')
  return {
    'X-User-Role':   payload?.roleCode ?? payload?.role ?? '',
    'X-Tenant-Uuid': payload?.tenantId ?? payload?.tenant_id ?? '',
  }
}

/**
 * Remplace le logo de l'établissement (POST multipart, avec progression).
 * Authentifié par le JWT ; envoie aussi X-User-Role et X-Tenant-Uuid pour le
 * middleware ContexteTenant (rôle de la Gateway en production, simulé en dev).
 * Un 401 déclenche un rafraîchissement du jeton puis un seul nouvel essai.
 * → { success: true, logoDocumentId }
 */
export function uploadLogo({ file, onProgress }) {
  const envoyer = (token) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${ADMIN_BASE}${ENV.apiPrefix}/interne/mon-etablissement/logo`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      // Headers de contexte tenant (X-User-Role + X-Tenant-Uuid)
      const ctx = headersContexte()
      if (ctx['X-User-Role'])   xhr.setRequestHeader('X-User-Role',   ctx['X-User-Role'])
      if (ctx['X-Tenant-Uuid']) xhr.setRequestHeader('X-Tenant-Uuid', ctx['X-Tenant-Uuid'])

      xhr.timeout = 120000
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
      xhr.onload = () => {
        let data
        try { data = JSON.parse(xhr.responseText) } catch { data = null }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(buildError(xhr.status, data))
      }
      xhr.onerror = () => reject(new ApiError({ kind: 'network', title: 'Service injoignable', message: 'Impossible de joindre le serveur. Vérifiez votre connexion Internet puis réessayez.' }))
      xhr.ontimeout = () => reject(new ApiError({ kind: 'timeout', title: 'Délai dépassé', message: "Le téléversement a pris trop de temps. Vérifiez votre connexion et réessayez." }))
      const fd = new FormData()
      fd.append('fichier', file)
      xhr.send(fd)
    })

  return envoyer(tokenStore.getAccess()).catch(async (err) => {
    if (err?.status === 401 && (await refreshSession())) return envoyer(tokenStore.getAccess())
    throw err
  })
}