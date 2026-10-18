import {
  useStatistiques,
  useStatistiquesConsolidees,
} from '../../../services/elearning/admin.js'
import { CarteKpi } from '../../../components/elearning/CarteKpi.jsx'
import { ErreurApi } from '../../../components/elearning/ErreurApi.jsx'
import { SqueletteGrille, SqueletteTableau } from '../../../components/elearning/Squelette.jsx'
import { formaterNombre, uuidCourt } from '../../../lib/elearning/format.js'

export function StatistiquesPage() {
  const stats = useStatistiques()
  const consolidees = useStatistiquesConsolidees()

  if (stats.isPending) {
    return (
      <>
        <h1>Statistiques</h1>
        <SqueletteGrille nombre={6} />
      </>
    )
  }
  if (stats.isError) {
    return <ErreurApi erreur={stats.error} reessayer={() => stats.refetch()} />
  }

  const donnees = stats.data

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Statistiques du tenant</h1>
          <span className="badge badge-texte">Vue agrégée en lecture seule</span>
        </div>
      </div>
      <p className="texte-efface">
        Indicateurs calculés en direct par /v1/statistiques/ - aucune donnée
        n'est dupliquée depuis les autres microservices.
      </p>

      <h2>Vue d'ensemble</h2>
      <div className="kpi-grille">
        <CarteKpi icone="menu_book" valeur={donnees.cours.total} libelle="Cours" />
        <CarteKpi icone="publish" valeur={donnees.cours.publies} libelle="Cours publiés" />
        <CarteKpi icone="archive" valeur={donnees.cours.archives} libelle="Cours archivés" />
        <CarteKpi icone="description" valeur={donnees.cours.lecons} libelle="Leçons" />
        <CarteKpi icone="assignment" valeur={donnees.devoirs.total} libelle="Devoirs" />
        <CarteKpi
          icone="inbox"
          valeur={donnees.devoirs.soumissions}
          libelle="Soumissions"
        />
        <CarteKpi
          icone="schedule"
          variante="rouge"
          valeur={donnees.devoirs.soumissions_en_retard}
          libelle="Soumissions en retard"
        />
        <CarteKpi
          icone="insights"
          variante="or"
          valeur={formaterNombre(donnees.devoirs.moyenne_notes)}
          libelle="Moyenne des devoirs"
        />
        <CarteKpi icone="quiz" valeur={donnees.quiz.total} libelle="Quiz" />
        <CarteKpi
          icone="history_edu"
          valeur={donnees.quiz.tentatives}
          libelle="Tentatives de quiz"
        />
        <CarteKpi
          icone="grading"
          valeur={formaterNombre(donnees.quiz.moyenne_tentatives)}
          libelle="Moyenne des tentatives validées"
        />
      </div>

      <section className="section">
        <h2>Consolidé par matière</h2>
        {consolidees.isPending ? (
          <SqueletteTableau colonnes={6} />
        ) : consolidees.isError ? (
          <ErreurApi
            erreur={consolidees.error}
            reessayer={() => consolidees.refetch()}
          />
        ) : (consolidees.data?.matieres ?? []).length === 0 ? (
          <p className="texte-efface">
            Aucune activité à consolider pour l'instant.
          </p>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Cours</th>
                  <th>Devoirs</th>
                  <th>Moyenne devoirs</th>
                  <th>Tentatives quiz</th>
                  <th>Moyenne quiz</th>
                </tr>
              </thead>
              <tbody>
                {(consolidees.data?.matieres ?? []).map((matiere) => (
                  <tr key={matiere.matiere_id}>
                    <td title={matiere.matiere_id}>
                      {uuidCourt(matiere.matiere_id)}
                    </td>
                    <td>{matiere.nb_cours ?? '-'}</td>
                    <td>{matiere.nb_devoirs ?? '-'}</td>
                    <td>{formaterNombre(matiere.moyenne_devoirs)}</td>
                    <td>{matiere.nb_tentatives_quiz ?? '-'}</td>
                    <td>{formaterNombre(matiere.moyenne_quiz)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
