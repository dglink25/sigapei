import { messageErreur } from '../../services/elearning/client.js'

export function ErreurApi({ erreur, reessayer }) {
  return (
    <div className="alerte alerte-erreur" role="alert">
      <p>{messageErreur(erreur)}</p>
      {reessayer && (
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={reessayer}
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
