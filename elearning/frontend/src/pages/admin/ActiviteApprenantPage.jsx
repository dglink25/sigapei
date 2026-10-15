import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useActiviteApprenant } from '../../api/admin.js'
import { BadgeRetard, BadgeStatut } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { SqueletteTableau } from '../../components/Squelette.jsx'
import { useProfilStore } from '../../stores/profil.js'
import { formaterDateHeure, formaterNombre } from '../../utils/format.js'

export function ActiviteApprenantPage() {
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const [saisie, setSaisie] = useState('')
  const [uuid, setUuid] = useState('')

  useEffect(() => {
    if (apprenantProfil) {
      setSaisie(apprenantProfil)
      setUuid(apprenantProfil)
    }
  }, [apprenantProfil])

  const activite = useActiviteApprenant(uuid)

  function consulter(evenement) {
    evenement.preventDefault()
    setUuid(saisie.trim())
  }

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Activité d'un apprenant</h1>
          <span className="badge badge-texte">Vue transverse - lecture seule</span>
        </div>
      </div>
      <p className="texte-efface">
        Soumissions de devoirs et tentatives de quiz de l'apprenant, sans
        dupliquer ses données scolaires (scolarite reste maître des données).
      </p>

      <form className="barre-filtres" onSubmit={consulter}>
        <div className="champ">
          <label htmlFor="activite-apprenant">
            Apprenant - UUID (scolarite.apprenants) *
          </label>
          <input
            id="activite-apprenant"
            type="text"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="bouton bouton-secondaire">
          Consulter
        </button>
      </form>

      {!uuid ? (
        <p className="texte-efface">
          Renseignez un UUID d'apprenant puis « Consulter ».
        </p>
      ) : activite.isPending ? (
        <SqueletteTableau colonnes={5} />
      ) : activite.isError ? (
        <ErreurApi erreur={activite.error} reessayer={() => activite.refetch()} />
      ) : (
        <>
          <section className="section">
            <h2>Soumissions de devoirs</h2>
            {(activite.data?.soumissions ?? []).length === 0 ? (
              <p className="texte-efface">Aucune soumission.</p>
            ) : (
              <div className="tableau-defilant">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Devoir</th>
                      <th>Dépôt</th>
                      <th>Note</th>
                      <th>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activite.data?.soumissions ?? []).map((soumission) => (
                      <tr key={soumission.uuid}>
                        <td>
                          <Link to={`/devoirs/${soumission.devoir_uuid}`}>
                            {soumission.devoir_titre}
                          </Link>
                        </td>
                        <td>
                          {formaterDateHeure(soumission.date_depot)}{' '}
                          {soumission.en_retard && <BadgeRetard />}
                        </td>
                        <td>{formaterNombre(soumission.note)}</td>
                        <td>
                          {soumission.note_reportee ? (
                            <span className="badge badge-valide">Reportée</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section">
            <h2>Tentatives de quiz</h2>
            {(activite.data?.tentatives_quiz ?? []).length === 0 ? (
              <p className="texte-efface">Aucune tentative.</p>
            ) : (
              <div className="tableau-defilant">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Tentative</th>
                      <th>Statut</th>
                      <th>Note</th>
                      <th>Soumission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activite.data?.tentatives_quiz ?? []).map((tentative) => (
                      <tr key={tentative.uuid}>
                        <td>
                          <Link to={`/tentatives/${tentative.uuid}`}>
                            {tentative.quiz_titre}
                          </Link>
                        </td>
                        <td>n° {tentative.numero}</td>
                        <td>
                          <BadgeStatut valeur={tentative.statut} />
                        </td>
                        <td>{formaterNombre(tentative.note_totale)}</td>
                        <td>{formaterDateHeure(tentative.date_soumission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
