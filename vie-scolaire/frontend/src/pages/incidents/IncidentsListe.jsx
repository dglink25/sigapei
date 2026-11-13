import { useState } from 'react'
import { Link } from 'react-router'

import { messageErreur } from '../../api/client.js'
import { useAppliquerSanction, useIncidentsListe } from '../../api/incidents.js'
import { BadgeTypeIncident } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { SqueletteTableau } from '../../components/Squelette.jsx'
import { estPilotage, useProfilStore } from '../../stores/profil.js'
import { formaterDateHeure, uuidCourt } from '../../utils/format.js'
import { TYPES_INCIDENT, libelleTypeIncident } from '../../utils/libelles.js'

/** Application d'une sanction à un incident (une sanction sans incident est impossible). */
function SanctionLigne({ incident, onFermer }) {
  const [sanction, setSanction] = useState(incident.sanction ?? '')
  const application = useAppliquerSanction()

  function valider(evenement) {
    evenement.preventDefault()
    application.mutate(
      { uuid: incident.uuid, sanction },
      { onSuccess: onFermer },
    )
  }

  return (
    <form className="carte-interieure" onSubmit={valider}>
      <div className="champ">
        <label htmlFor={`sanction-${incident.uuid}`}>Sanction (1000 max)</label>
        <textarea
          id={`sanction-${incident.uuid}`}
          value={sanction}
          maxLength={1000}
          onChange={(e) => setSanction(e.target.value)}
          placeholder="Ex. : exclusion de 2 jours, retenue, avertissement écrit…"
          required
        />
      </div>
      <p className="aide">
        L&#39;application d&#39;une sanction exige un jeton CAPTCHA (règle n°4) et
        est journalisée (audit_log).
      </p>
      <div className="actions-ligne" style={{ marginTop: '0.5rem' }}>
        <button
          type="submit"
          className="bouton bouton-vert bouton-compact"
          disabled={application.isPending}
        >
          {application.isPending ? 'Application…' : 'Appliquer la sanction'}
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire bouton-compact"
          onClick={onFermer}
        >
          Annuler
        </button>
      </div>
      {application.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(application.error)}
        </p>
      )}
    </form>
  )
}

export function IncidentsListe() {
  const role = useProfilStore((etat) => etat.role)
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const classeProfil = useProfilStore((etat) => etat.classeId)

  const [brouillon, setBrouillon] = useState({
    apprenant_uuid: '',
    classe_uuid: '',
    type: '',
  })
  const [filtres, setFiltres] = useState({})
  const [sanctionUuid, setSanctionUuid] = useState(null)

  const params = Object.fromEntries(
    Object.entries(filtres).filter(([, valeur]) => valeur !== '' && valeur != null),
  )
  const incidents = useIncidentsListe(params)

  function appliquer(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setSanctionUuid(null)
  }

  function reinitialiser() {
    const vide = { apprenant_uuid: '', classe_uuid: '', type: '' }
    setBrouillon(vide)
    setFiltres({})
  }

  const liste = incidents.data ?? []

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Incidents &amp; sanctions</h1>
          <span className="badge badge-texte">
            {incidents.isSuccess ? `${liste.length} incident(s)` : '…'}
          </span>
        </div>
        <Link to="/incidents/nouveau" className="bouton bouton-primaire">
          <Icone nom="add" />
          Signaler un incident
        </Link>
      </div>

      <form className="barre-filtres" onSubmit={appliquer}>
        <div className="champ">
          <label htmlFor="i-apprenant">Apprenant (UUID)</label>
          <input
            id="i-apprenant"
            type="text"
            value={brouillon.apprenant_uuid}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, apprenant_uuid: e.target.value }))
            }
            placeholder={apprenantProfil || 'Tous les apprenants'}
          />
        </div>
        <div className="champ">
          <label htmlFor="i-classe">Classe (UUID)</label>
          <input
            id="i-classe"
            type="text"
            value={brouillon.classe_uuid}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_uuid: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <div className="champ">
          <label htmlFor="i-type">Type</label>
          <select
            id="i-type"
            value={brouillon.type}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, type: e.target.value }))
            }
          >
            <option value="">Tous</option>
            {TYPES_INCIDENT.map((valeur) => (
              <option key={valeur} value={valeur}>
                {libelleTypeIncident(valeur)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="bouton bouton-secondaire">
          Filtrer
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={reinitialiser}
        >
          Réinitialiser
        </button>
      </form>

      <section className="section">
        {incidents.isPending ? (
          <SqueletteTableau colonnes={5} lignes={6} />
        ) : incidents.isError ? (
          <ErreurApi erreur={incidents.error} reessayer={() => incidents.refetch()} />
        ) : liste.length === 0 ? (
          <p className="texte-efface">
            Aucun incident ne correspond à ces critères.
          </p>
        ) : (
          <>
            <div className="tableau-defilant">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Signalé le</th>
                    <th>Apprenant</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Sanction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((incident) => (
                    <tr key={incident.uuid}>
                      <td className="texte-efface">
                        {formaterDateHeure(incident.cree_le)}
                      </td>
                      <td>
                        <Link
                          to={`/apprenants/${incident.apprenant_uuid}/dossier`}
                          className="police-mono"
                        >
                          {uuidCourt(incident.apprenant_uuid)}
                        </Link>
                      </td>
                      <td>
                        <BadgeTypeIncident valeur={incident.type} />
                      </td>
                      <td style={{ maxWidth: '22rem' }}>
                        {incident.description
                          ? `${incident.description.slice(0, 140)}${
                              incident.description.length > 140 ? '…' : ''
                            }`
                          : '-'}
                      </td>
                      <td>
                        {incident.sanction ? (
                          <>
                            <span className="badge badge-valide">Sanctionnée</span>
                            <p className="texte-efface" style={{ margin: '0.25rem 0 0' }}>
                              {incident.sanction.slice(0, 80)}
                              {incident.sanction.length > 80 ? '…' : ''}
                            </p>
                          </>
                        ) : (
                          <span className="badge badge-brouillon">
                            Sans sanction
                          </span>
                        )}
                      </td>
                      <td>
                        {estPilotage(role) && (
                          <button
                            type="button"
                            className="bouton bouton-secondaire bouton-compact"
                            onClick={() =>
                              setSanctionUuid(
                                sanctionUuid === incident.uuid
                                  ? null
                                  : incident.uuid,
                              )
                            }
                          >
                            <Icone nom="gavel" />
                            {incident.sanction ? 'Modifier' : 'Sanctionner'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sanctionUuid && (
              <div style={{ marginTop: '0.75rem' }}>
                <SanctionLigne
                  key={sanctionUuid}
                  incident={liste.find((i) => i.uuid === sanctionUuid)}
                  onFermer={() => setSanctionUuid(null)}
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
