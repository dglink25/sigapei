import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useDossierVieScolaire } from '../../api/dossier.js'
import { BadgeStatutPresence } from '../../components/BadgeStatut.jsx'
import { CarteKpi } from '../../components/CarteKpi.jsx'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { SqueletteCarte, SqueletteTableau } from '../../components/Squelette.jsx'
import { useProfilStore } from '../../stores/profil.js'
import { uuidCourt } from '../../utils/format.js'

/** Barre de sélection de l'apprenant (uuid en URL). */
function SelectionApprenant({ uuidInitial }) {
  const navigate = useNavigate()
  const [saisie, setSaisie] = useState(uuidInitial || '')

  function valider(evenement) {
    evenement.preventDefault()
    const propre = saisie.trim()
    if (propre) {
      navigate(`/apprenants/${propre}/dossier`)
    }
  }

  return (
    <form className="barre-filtres" onSubmit={valider}>
      <div className="champ" style={{ flex: 1 }}>
        <label htmlFor="dossier-uuid">Apprenant — UUID (scolarite.apprenants)</label>
        <input
          id="dossier-uuid"
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="UUID de l’apprenant"
        />
      </div>
      <button type="submit" className="bouton bouton-primaire">
        <Icone nom="person_search" />
        Ouvrir le dossier
      </button>
    </form>
  )
}

export function DossierVieScolaire() {
  const { uuid } = useParams()
  const apprenantProfil = useProfilStore((etat) => etat.apprenantId)
  const dossier = useDossierVieScolaire(uuid)

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Dossier vie scolaire</h1>
          <span className="badge badge-texte">Vue consolidée</span>
        </div>
      </div>

      <p className="texte-efface">
        Présences récentes, synthèse d&#39;absences sur la période glissante et
        incidents disciplinaires d&#39;un apprenant. Réservée au parent, à
        l&#39;apprenant lui-même et aux profils habilités.
      </p>

      <SelectionApprenant uuidInitial={uuid || apprenantProfil} />

      {!uuid ? (
        <p className="texte-efface section">
          Renseignez l&#39;UUID d&#39;un apprenant (ou configurez-le dans le{' '}
          <Link to="/profil">profil de démonstration</Link>) pour consulter son
          dossier.
        </p>
      ) : dossier.isPending ? (
        <section className="section">
          <div className="kpi-grille">
            <SqueletteCarte />
            <SqueletteCarte />
            <SqueletteCarte />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <SqueletteTableau colonnes={4} lignes={5} />
          </div>
        </section>
      ) : dossier.isError ? (
        <section className="section">
          <ErreurApi erreur={dossier.error} reessayer={() => dossier.refetch()} />
        </section>
      ) : (
        <DonneesDossier dossier={dossier.data} />
      )}
    </>
  )
}

function DonneesDossier({ dossier }) {
  const synthese = dossier.synthese_absences ?? {}
  const presences = dossier.presences_recentes ?? []
  const incidents = dossier.incidents ?? []

  return (
    <>
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>
            Synthèse —{' '}
            <code className="police-mono">{uuidCourt(dossier.apprenant_uuid)}</code>
          </h2>
          {synthese.seuil_depasse && (
            <span className="badge badge-retard">
              <Icone nom="warning" />
              Seuil d&#39;absences dépassé
            </span>
          )}
        </div>
        <div className="kpi-grille">
          <CarteKpi
            icone="event_busy"
            variante="rouge"
            valeur={synthese.total_absences ?? 0}
            libelle="Absences"
          />
          <CarteKpi
            icone="schedule"
            variante="or"
            valeur={synthese.total_retards ?? 0}
            libelle="Retards"
          />
          <CarteKpi
            icone="how_to_reg"
            valeur={synthese.total_presences ?? 0}
            libelle="Présences"
          />
          <CarteKpi
            icone="rule"
            valeur={synthese.seuil ?? '-'}
            libelle={`Seuil (${synthese.periode_glissante_jours ?? '-'} j)`}
          />
        </div>
      </section>

      <section className="section">
        <h2>Présences récentes</h2>
        {presences.length === 0 ? (
          <p className="texte-efface">Aucune présence enregistrée.</p>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Cours</th>
                </tr>
              </thead>
              <tbody>
                {presences.map((presence) => (
                  <tr key={presence.uuid}>
                    <td>{presence.date}</td>
                    <td>
                      <BadgeStatutPresence valeur={presence.statut} />
                    </td>
                    <td>
                      <code className="police-mono">
                        {uuidCourt(presence.cours_uuid)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Incidents disciplinaires</h2>
          <Link to="/incidents" className="texte-efface">
            Voir tous les incidents
          </Link>
        </div>
        {incidents.length === 0 ? (
          <p className="texte-efface">Aucun incident signalé.</p>
        ) : (
          <div className="liste-elements">
            {incidents.map((incident) => (
              <article className="element" key={incident.uuid}>
                <div className="element-tete">
                  <h3>{incident.type}</h3>
                  {incident.sanction ? (
                    <span className="badge badge-valide">Sanctionnée</span>
                  ) : (
                    <span className="badge badge-brouillon">Sans sanction</span>
                  )}
                </div>
                <p style={{ margin: '0.4rem 0' }}>{incident.description}</p>
                {incident.sanction && (
                  <p className="texte-efface" style={{ margin: 0 }}>
                    <strong>Sanction :</strong> {incident.sanction}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
