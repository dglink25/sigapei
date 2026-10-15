import { useEffect } from 'react'
import { ENV } from '../../config/commun/env'

/**
 * Met à jour le <title> de la page dynamiquement.
 * Format : "Titre de la page - SIGAPEI"
 * Si aucun titre fourni : "SIGAPEI"
 */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} - ${ENV.appName}` : ENV.appName
    return () => { document.title = ENV.appName }
  }, [title])
}
