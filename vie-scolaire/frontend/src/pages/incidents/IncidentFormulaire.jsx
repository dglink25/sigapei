import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { messageErreur } from '../../api/client.js'
import { useSignalerIncident } from '../../api/incidents.js'
import { Icone } from '../../components/Icone.jsx'
import { useProfilStore } from '../../stores/profil.js'
import { TYPES_INCIDENT, libelleTypeIncident } from '../../utils/libelles.js'

export function IncidentFormulaire() {
  const navigate = useNavigate()
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [apprenantUuid, setApprenantUuid] = useState(apprenantProfil || '')
  const [type, setType] = useState('comportement')
  const [description, setDescription] = useState('')

  const signalement = useSignalerIncident()

  function soumettre(evenement) {
    evenement.preventDefault()
    signalement.mutate(
      { apprenant_uuid: apprenantUuid.trim(), type, description },
      { onSuccess: () => navigate('/incidents') },
    )
  }

  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/incidents">Incidents</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Signalement</span>
      </nav>

      <div className="bandeau-sticky">
        <div className="titre-page">
          <div>
            <h1>Signaler un incident disciplinaire</h1>
            <span className="badge badge-brouillon">Nouveau</span>
          </div>
          <div className="actions-ligne">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={() => navigate(-1)}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="formulaire-incident"
              className="bouton bouton-vert"
              disabled={signalement.isPending}
            >
              {signalement.isPending ? (
                <>
                  <span className="roue" aria-hidden="true" /> Enregistrement…
                </>
              ) : (
                <>
                  <Icone nom="save" />
                  Signaler
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="texte-efface">
        Un incident peut exister sans sanction ; une sanction ne peut jamais
        exister sans incident (règle de gestion, section 9). La sanction
        s&#39;applique ensuite depuis la liste des incidents.
      </p>

      <form id="formulaire-incident" className="carte formulaire" onSubmit={soumettre}>
        <div className="grille-2-colonnes">
          <div className="champ">
            <label htmlFor="incident-apprenant">Apprenant — UUID *</label>
            <input
              id="incident-apprenant"
              type="text"
              value={apprenantUuid}
              onChange={(e) => setApprenantUuid(e.target.value)}
              placeholder={apprenantProfil || classeProfil || 'UUID de l’apprenant'}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="incident-type">Type d&#39;incident *</label>
            <select
              id="incident-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              {TYPES_INCIDENT.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {libelleTypeIncident(valeur)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="champ">
          <label htmlFor="incident-description">Description (2000 max) *</label>
          <textarea
            id="incident-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez les faits, le contexte et les personnes présentes."
            required
          />
        </div>

        <p className="aide">
          Le signalement exige un jeton CAPTCHA (règle n°4). Auteur = utilisateur
          courant (X-User-Id), résolu côté backend dans rh.personnel.
        </p>

        {signalement.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(signalement.error)}
          </p>
        )}
      </form>
    </>
  )
}
