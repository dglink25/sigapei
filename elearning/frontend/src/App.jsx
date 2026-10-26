import { Navigate, Route, Routes } from 'react-router'

import { Layout } from './components/Layout.jsx'
import { Accueil } from './pages/Accueil.jsx'
import { PageIntrouvable } from './pages/PageIntrouvable.jsx'
import { ProfilPage } from './pages/ProfilPage.jsx'
import { CoursDetail } from './pages/cours/CoursDetail.jsx'
import { CoursFormulaire } from './pages/cours/CoursFormulaire.jsx'
import { CoursListe } from './pages/cours/CoursListe.jsx'
import { DevoirDetail } from './pages/devoirs/DevoirDetail.jsx'
import { DevoirFormulaire } from './pages/devoirs/DevoirFormulaire.jsx'
import { DevoirsListe } from './pages/devoirs/DevoirsListe.jsx'
import { QuizDetail } from './pages/quiz/QuizDetail.jsx'
import { QuizFormulaire } from './pages/quiz/QuizFormulaire.jsx'
import { QuizListe } from './pages/quiz/QuizListe.jsx'
import { QuizPassation } from './pages/quiz/QuizPassation.jsx'
import { TentativeDetail } from './pages/quiz/TentativeDetail.jsx'
import { RessourcesListe } from './pages/bibliotheque/RessourcesListe.jsx'
import { MediasListe } from './pages/medias/MediasListe.jsx'
import { ActiviteApprenantPage } from './pages/admin/ActiviteApprenantPage.jsx'
import { ParametresPage } from './pages/admin/ParametresPage.jsx'
import { StatistiquesPage } from './pages/admin/StatistiquesPage.jsx'
import { useProfilStore } from './stores/profil.js'

// Rôles autorisés par famille de routes (bilan RBAC validé).
const GESTION = ['enseignant', 'administrateur']
const ADMINISTRATION = ['administrateur']
const SANS_PARENT = ['apprenant', 'enseignant', 'administrateur']
const APPRENANT = ['apprenant']

/**
 * Garde de route : redirige vers l'accueil si le rôle simulé n'est pas
 * autorisé. La sécurité de référence reste celle de l'API (en-tête
 * X-Role vérifié par les permissions DRF) - ceci n'empêche que
 * d'afficher une page inutile.
 */
function RouteProtegee({ roles, children }) {
  const role = useProfilStore((etat) => etat.role)
  if (!roles.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="cours" element={<CoursListe />} />
        <Route
          path="cours/nouveau"
          element={(
            <RouteProtegee roles={GESTION}>
              <CoursFormulaire />
            </RouteProtegee>
          )}
        />
        <Route path="cours/:uuid" element={<CoursDetail />} />
        <Route
          path="cours/:uuid/modifier"
          element={(
            <RouteProtegee roles={GESTION}>
              <CoursFormulaire />
            </RouteProtegee>
          )}
        />
        <Route path="devoirs" element={<DevoirsListe />} />
        <Route
          path="devoirs/nouveau"
          element={(
            <RouteProtegee roles={GESTION}>
              <DevoirFormulaire />
            </RouteProtegee>
          )}
        />
        <Route path="devoirs/:uuid" element={<DevoirDetail />} />
        <Route
          path="quiz"
          element={(
            <RouteProtegee roles={SANS_PARENT}>
              <QuizListe />
            </RouteProtegee>
          )}
        />
        <Route
          path="quiz/nouveau"
          element={(
            <RouteProtegee roles={GESTION}>
              <QuizFormulaire />
            </RouteProtegee>
          )}
        />
        <Route
          path="quiz/:uuid"
          element={(
            <RouteProtegee roles={SANS_PARENT}>
              <QuizDetail />
            </RouteProtegee>
          )}
        />
        <Route
          path="quiz/:uuid/passer"
          element={(
            <RouteProtegee roles={APPRENANT}>
              <QuizPassation />
            </RouteProtegee>
          )}
        />
        <Route
          path="tentatives/:uuid"
          element={(
            <RouteProtegee roles={SANS_PARENT}>
              <TentativeDetail />
            </RouteProtegee>
          )}
        />
        <Route path="bibliotheque" element={<RessourcesListe />} />
        <Route
          path="medias"
          element={(
            <RouteProtegee roles={GESTION}>
              <MediasListe />
            </RouteProtegee>
          )}
        />
        <Route
          path="administration/statistiques"
          element={(
            <RouteProtegee roles={GESTION}>
              <StatistiquesPage />
            </RouteProtegee>
          )}
        />
        <Route
          path="administration/parametres"
          element={(
            <RouteProtegee roles={ADMINISTRATION}>
              <ParametresPage />
            </RouteProtegee>
          )}
        />
        <Route
          path="administration/apprenant"
          element={(
            <RouteProtegee roles={GESTION}>
              <ActiviteApprenantPage />
            </RouteProtegee>
          )}
        />
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  )
}
