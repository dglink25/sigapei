import { Link } from 'react-router'

import { useAlertesAbsences } from '../../api/alertes.js'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { SqueletteTableau } from '../../components/Squelette.jsx'
import { uuidCourt } from '../../utils/format.js'

export function AlertesAbsences() {
  const alertes = useAlertesAbsences()
  const liste = alertes.data ?? []

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Alertes d&#39;absences</h1>
          <span className="badge badge-texte">Back-office censeur</span>
        </div>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={() => alertes.refetch()}
          disabled={alertes.isFetching}
        >
          <Icone nom="refresh" />
          {alertes.isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      <div className="alerte alerte-info" role="note">
        Endpoint interne (règle n°3) : <code>GET /v1/interne/alertes-absences</code>{' '}
        n&#39;est jamais appelé par un client final en production. En développement,
        le proxy Vite injecte l&#39;en-tête <code>X-Internal-Secret</code> côté
        serveur à partir de la variable <code>INTERNAL_API_SECRET</code>.
      </div>

      <p className="texte-efface">
        Apprenants ayant dépassé le seuil d&#39;absences (valeur par défaut
        configurable) sur la période glissante. Le seuil ne peut être désactivé,
        seulement ajusté.
      </p>

      <section className="section">
        {alertes.isPending ? (
          <SqueletteTableau colonnes={4} lignes={5} />
        ) : alertes.isError ? (
          <ErreurApi erreur={alertes.error} reessayer={() => alertes.refetch()} />
        ) : liste.length === 0 ? (
          <div className="carte carte-creme" style={{ textAlign: 'center' }}>
            <span className="kpi-icone" style={{ margin: '0 auto' }}>
              <Icone nom="check_circle" />
            </span>
            <h2 style={{ marginTop: '0.6rem' }}>Aucune alerte</h2>
            <p className="texte-efface" style={{ margin: 0 }}>
              Aucun apprenant n&#39;a dépassé le seuil sur la période glissante.
            </p>
          </div>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Absences</th>
                  <th>Seuil</th>
                  <th>Période</th>
                  <th>Dossier</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((alerte) => (
                  <tr key={alerte.apprenant_uuid}>
                    <td>
                      <code className="police-mono">
                        {uuidCourt(alerte.apprenant_uuid)}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-retard">
                        {alerte.total_absences}
                      </span>
                    </td>
                    <td>{alerte.seuil}</td>
                    <td className="texte-efface">{alerte.periode_jours} jours</td>
                    <td>
                      <Link
                        to={`/apprenants/${alerte.apprenant_uuid}/dossier`}
                        className="bouton bouton-secondaire bouton-compact"
                      >
                        <Icone nom="folder_shared" />
                        Ouvrir
                      </Link>
                    </td>
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
