import { ApiError } from './http'

const DEFAULT = {
  title: 'Erreur inattendue',
  message: "Une erreur inattendue est survenue. Veuillez réessayer ; si le problème persiste, contactez l'administration.",
}

/** Transforme n'importe quelle erreur en { title, message } lisible, ou null si rien a afficher. */
export function toNotice(err) {
  if (err?.sessionExpired) return null // deja signale par la deconnexion automatique
  if (err instanceof ApiError) return { title: err.title, message: err.message }

  switch (err?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/popup-blocked':
      return { title: 'Fenêtre bloquée', message: 'Autorisez les fenêtres pop-up pour ce site puis réessayez.' }
    case 'auth/account-exists-with-different-credential':
      return { title: 'Compte existant', message: 'Un compte existe déjà avec une autre méthode de connexion.' }
    case 'auth/network-request-failed':
      return { title: 'Service injoignable', message: 'Vérifiez votre connexion Internet puis réessayez.' }
    default:
  }

  switch (err?.name) {
    case 'NotAllowedError':
      return { title: 'Empreinte non validée', message: 'La vérification biométrique a été annulée ou a expiré sur cet appareil.' }
    case 'InvalidStateError':
      return { title: 'Empreinte déjà enregistrée', message: 'Cet appareil dispose déjà d’une empreinte enregistrée pour ce compte.' }
    case 'NotSupportedError':
    case 'SecurityError':
      return { title: 'Biométrie indisponible', message: 'Cet appareil ou ce navigateur ne permet pas la connexion par empreinte.' }
    default:
      return DEFAULT
  }
}
