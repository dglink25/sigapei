import { useState } from 'react'
import { Link } from 'react-router'

import { messageErreur } from '../../api/client.js'
import { useCorrigerPresence, usePresencesListe } from '../../api/presences.js'
import { BadgeStatutPresence } from '../../components/BadgeStatut.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { SqueletteTableau } from '../../components/Squelette.jsx'
import { peutCorriger, useProfilStore } from '../../stores/profil.js'
import { dateAujourdhui, formaterDateHeure, uuidCourt } from '../../utils/format.js'

const STATUTS = [
  { valeur: 'present', libelle: 'Présent' },
  { valeur: 'absent', libelle: 'Absent' },
  { valeur: 'retard', libelle: 'Retard' },
]

/** Formulaire de correction (statut + motif) d'une présence déjà enregistrée. */
function CorrectionLigne({ presence, onFermer }) {
  const [statut, setStatut] = useState(presence.statut)
  const [motif, setMotif] = useState('')
  const correction = useCorrigerPresence()

  function valider(evenement) {
    evenement.preventDefault()
    correction.mutate(
      { uuid: presence.uuid, statut, motif: motif || null },
      { onSuccess: onFermer },
    )
  }

  return (
    <form className="carte-interieure" onSubmit={valider}>
      <div className="grille-2-colonnes">
        <div className="champ">
          <label htmlFor={`statut-${presence.uuid}`}>Nouveau statut</label>
          <select
            id={`statut-${presence.uuid}`}
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            {STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="champ">
          <label htmlFor={`motif-${presence.uuid}`}>Motif (500 max)</label>
          <input
            id={`motif-${presence.uuid}`}
            type="text"
            value={motif}
            maxLength={500}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif de la correction (journalisé)"
          />
        </div>
      </div>
      <p className="aide">
        La correction exige un jeton CAPTCHA (règle n°4). Enseignant : le jour
        même uniquement ; au-delà, censeur ou administrateur.
      </p>
      <div className="actions-ligne" style={{ marginTop: '0.5rem' }}>
        <button
          type="submit"
          className="bouton bouton-vert bouton-compact"
          disabled={correction.isPending}
        >
          {correction.isPending ? 'Enregistrement…' : 'Enregistrer la correction'}
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire bouton-compact"
          onClick={onFermer}
        >
          Annuler
        </button>
      </div>
      {correction.isError && (
        <p className="erreur-champ" role="alert">
          {messageErreur(correction.error)}
        </p>
      )}
    </form>
  )
}

export function PresencesListe() {
  const role = useProfilStore((etat) => etat.role)
  const classeProfil = useProfilStore((etat) => etat.classeId)
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const coursProfil = useProfilStore((etat) => etat.coursId)

  const [brouillon, setBrouillon] = useState({
    classe_uuid: '',
    apprenant_uuid: '',
    cours_uuid: '',
    statut: '',
    date: '',
  })
  const [filtres, setFiltres] = useState({})
  const [correctionUuid, setCorrectionUuid] = useState(null)

  const params = Object.fromEntries(
    Object.entries(filtres).filter(([, valeur]) => valeur !== '' && valeur != null),
  )
  const presences = usePresencesListe(params)

  function appliquer(evenement) {
    evenement.preventDefault()
    setFiltres(brouillon)
    setCorrectionUuid(null)
  }

  function reinitialiser() {
    const vide = {
      classe_uuid: '',
      apprenant_uuid: '',
      cours_uuid: '',
      statut: '',
      date: '',
    }
    setBrouillon(vide)
    setFiltres({})
  }

  const liste = presences.data ?? []

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Présences &amp; absences</h1>
          <span className="badge badge-texte">
            {presences.isSuccess ? `${liste.length} enregistrement(s)` : '…'}
          </span>
        </div>
        <Link to="/presences/nouvelle" className="bouton bouton-primaire">
          <Icone nom="add" />
          Saisir des présences
        </Link>
      </div>

      <form className="barre-filtres" onSubmit={appliquer}>
        <div className="champ">
          <label htmlFor="f-classe">Classe (UUID)</label>
          <input
            id="f-classe"
            type="text"
            value={brouillon.classe_uuid}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, classe_uuid: e.target.value }))
            }
            placeholder={classeProfil || 'Toutes les classes'}
          />
        </div>
        <div className="champ">
          <label htmlFor="f-apprenant">Apprenant (UUID)</label>
          <input
            id="f-apprenant"
            type="text"
            value={brouillon.apprenant_uuid}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, apprenant_uuid: e.target.value }))
            }
            placeholder={apprenantProfil || 'Tous les apprenants'}
          />
        </div>
        <div className="champ">
          <label htmlFor="f-cours">Cours (UUID)</label>
          <input
            id="f-cours"
            type="text"
            value={brouillon.cours_uuid}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, cours_uuid: e.target.value }))
            }
            placeholder={coursProfil || 'Tous les cours'}
          />
        </div>
        <div className="champ">
          <label htmlFor="f-statut">Statut</label>
          <select
            id="f-statut"
            value={brouillon.statut}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, statut: e.target.value }))
            }
          >
            <option value="">Tous</option>
            {STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="f-date">Date</label>
          <input
            id="f-date"
            type="date"
            value={brouillon.date}
            max={dateAujourdhui()}
            onChange={(e) =>
              setBrouillon((etat) => ({ ...etat, date: e.target.value }))
            }
          />
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
        {presences.isPending ? (
          <SqueletteTableau colonnes={5} lignes={6} />
        ) : presences.isError ? (
          <ErreurApi erreur={presences.error} reessayer={() => presences.refetch()} />
        ) : liste.length === 0 ? (
          <p className="texte-efface">
            Aucune présence ne correspond à ces critères.
          </p>
        ) : (
          <>
            <div className="tableau-defilant">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Apprenant</th>
                    <th>Cours</th>
                    <th>Statut</th>
                    <th>Corrigé le</th>
                    {peutCorriger(role) && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {liste.map((presence) => (
                    <tr key={presence.uuid}>
                      <td>{presence.date}</td>
                      <td>
                        <Link to={`/apprenants/${presence.apprenant_uuid}/dossier`}>
                          <code className="police-mono">
                            {uuidCourt(presence.apprenant_uuid)}
                          </code>
                        </Link>
                      </td>
                      <td>
                        <code className="police-mono">
                          {uuidCourt(presence.cours_uuid)}
                        </code>
                      </td>
                      <td>
                        <BadgeStatutPresence valeur={presence.statut} />
                      </td>
                      <td className="texte-efface">
                        {formaterDateHeure(presence.corrige_le)}
                      </td>
                      {peutCorriger(role) && (
                        <td>
                          <button
                            type="button"
                            className="bouton bouton-secondaire bouton-compact"
                            onClick={() =>
                              setCorrectionUuid(
                                correctionUuid === presence.uuid
                                  ? null
                                  : presence.uuid,
                              )
                            }
                          >
                            <Icone nom="edit" />
                            Corriger
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {correctionUuid && (
              <div style={{ marginTop: '0.75rem' }}>
                <CorrectionLigne
                  key={correctionUuid}
                  presence={liste.find((p) => p.uuid === correctionUuid)}
                  onFermer={() => setCorrectionUuid(null)}
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
