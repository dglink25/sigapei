import { Link } from 'react-router'

import { Icone } from '../components/Icone.jsx'
import { useProfilStore } from '../stores/profil.js'

const RACCOURCIS = [
  {
    vers: '/presences',
    titre: 'Présences & absences',
    texte:
      'Enregistrer les présences d’un cours et consulter/corriger les absences et retards.',
    icone: 'how_to_reg',
    bandeau: 'vert',
  },
  {
    vers: '/incidents',
    titre: 'Incidents & sanctions',
    texte:
      'Signaler un incident disciplinaire et lui associer une sanction (jamais de sanction sans incident).',
    icone: 'gavel',
    bandeau: 'or',
  },
  {
    vers: '/dossier',
    titre: 'Dossier vie scolaire',
    texte:
      'Vue consolidée d’un apprenant : présences récentes, synthèse d’absences et incidents.',
    icone: 'folder_shared',
    bandeau: 'vert',
  },
  {
    vers: '/alertes',
    titre: 'Alertes absences',
    texte:
      'Apprenants ayant dépassé le seuil d’absences sur la période glissante (back-office censeur).',
    icone: 'notifications_active',
    bandeau: 'rouge',
  },
]

export function Accueil() {
  const tenantId = useProfilStore((etat) => etat.tenantId)

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Tableau de bord</h1>
          <span className="badge badge-texte">Espace Vie Scolaire</span>
        </div>
      </div>
      <p className="texte-efface">
        Module Vie scolaire de la plateforme SIGAPEI : présences et absences,
        incidents disciplinaires et sanctions, dossier consolidé de l’apprenant
        et alertes au seuil d’absences, par établissement (tenant).
      </p>

      <div className="grille-cartes">
        {RACCOURCIS.map((raccourci) => (
          <Link
            key={raccourci.vers}
            to={raccourci.vers}
            className={`carte lien-carte carte-bandeau-${raccourci.bandeau}`}
          >
            <span className="kpi-icone">
              <Icone nom={raccourci.icone} />
            </span>
            <h3>{raccourci.titre}</h3>
            <p className="texte-efface">{raccourci.texte}</p>
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="element-tete">
          <h2>Prise en main</h2>
          {tenantId && (
            <span className="badge badge-synchro">
              <Icone nom="cloud_done" />
              Établissement connecté
            </span>
          )}
        </div>
        {!tenantId ? (
          <p className="texte-efface">
            Configurez le tenant (identifiant numérique) depuis le{' '}
            <Link to="/profil">profil de démonstration</Link> pour interroger le
            module.
          </p>
        ) : (
          <p className="texte-efface">
            Les écritures (présences, incidents, sanctions) exigent en plus un
            jeton CAPTCHA. Renseignez-le depuis le{' '}
            <Link to="/profil">profil de démonstration</Link>.
          </p>
        )}
      </section>
    </>
  )
}
