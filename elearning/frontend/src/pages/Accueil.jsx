import { Link } from 'react-router'

import { useStatistiques } from '../api/admin.js'
import { CarteKpi } from '../components/CarteKpi.jsx'
import { Icone } from '../components/Icone.jsx'
import { SqueletteCarte } from '../components/Squelette.jsx'
import { peutPublier, useProfilStore } from '../stores/profil.js'
import { formaterNombre } from '../utils/format.js'

// Le raccourci Quiz est masqué au parent (pas de passage de quiz).
const SANS_PARENT = ['apprenant', 'enseignant', 'administrateur']

const RACCOURCIS = [
  {
    vers: '/cours',
    titre: 'Cours & Syllabus',
    texte: 'Publier et consulter les cours et leurs leçons (texte, documents, vidéos).',
    icone: 'menu_book',
    bandeau: 'vert',
  },
  {
    vers: '/devoirs',
    titre: 'Devoirs & Évaluations',
    texte: 'Créer des devoirs, déposer des soumissions, noter et reporter les notes.',
    icone: 'assignment',
    bandeau: 'or',
  },
  {
    vers: '/quiz',
    titre: 'Quiz & QCM',
    texte: 'Composer des QCM et questions ouvertes, suivre les tentatives et la validation.',
    icone: 'quiz',
    bandeau: 'vert',
    roles: SANS_PARENT,
  },
  {
    vers: '/bibliotheque',
    titre: 'Bibliothèque',
    texte: 'Ressources pédagogiques partagées, classées par matière et classe.',
    icone: 'local_library',
    bandeau: 'gris',
  },
]

export function Accueil() {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  const role = useProfilStore((etat) => etat.role)
  // Indicateurs du tenant : réservés enseignant/administrateur (RBAC).
  const indicateurs = peutPublier(role)
  const statistiques = useStatistiques({
    enabled: Boolean(tenantId) && indicateurs,
  })

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Tableau de Bord</h1>
          <span className="badge badge-texte">Espace E-Learning</span>
        </div>
      </div>
      <p className="texte-efface">
        Module pédagogique de la plateforme E-Académique : cours, devoirs,
        quiz et bibliothèque numérique de l'établissement.
      </p>

      <div className="grille-cartes">
        {RACCOURCIS.filter((r) => !r.roles || r.roles.includes(role)).map(
          (raccourci) => (
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

      {indicateurs && (
      <section className="section">
        <div className="element-tete">
          <h2>Indicateurs du module</h2>
          {tenantId && (
            <span className="badge badge-synchro">
              <Icone nom="cloud_done" />
              Établissement connecté
            </span>
          )}
        </div>
        {!tenantId ? (
          <p className="texte-efface">
            Configurez le tenant depuis le{' '}
            <Link to="/profil">profil de démonstration</Link> pour charger les
            statistiques de l'établissement.
          </p>
        ) : statistiques.isPending ? (
          <div className="kpi-grille">
            <SqueletteCarte />
            <SqueletteCarte />
            <SqueletteCarte />
            <SqueletteCarte />
          </div>
        ) : (
          <div className="kpi-grille">
            <CarteKpi
              icone="menu_book"
              valeur={statistiques.data?.cours?.publies ?? 0}
              libelle="Cours publiés"
            />
            <CarteKpi
              icone="inbox"
              valeur={statistiques.data?.devoirs?.soumissions ?? 0}
              libelle="Soumissions reçues"
            />
            <CarteKpi
              icone="quiz"
              valeur={statistiques.data?.quiz?.tentatives ?? 0}
              libelle="Tentatives de quiz"
            />
            <CarteKpi
              icone="insights"
              variante="or"
              valeur={formaterNombre(statistiques.data?.devoirs?.moyenne_notes)}
              libelle="Moyenne des devoirs"
            />
          </div>
        )}
      </section>
      )}
    </>
  )
}
