import { Navigate, Route, Routes } from 'react-router-dom'

import './elearning.css'
import { Layout } from '../../components/elearning/Layout.jsx'
import { Accueil } from './Accueil.jsx'
import { PageIntrouvable } from './PageIntrouvable.jsx'
import { ProfilPage } from './ProfilPage.jsx'
import { CoursDetail } from './cours/CoursDetail.jsx'
import { CoursFormulaire } from './cours/CoursFormulaire.jsx'
import { CoursListe } from './cours/CoursListe.jsx'
import { DevoirDetail } from './devoirs/DevoirDetail.jsx'
import { DevoirFormulaire } from './devoirs/DevoirFormulaire.jsx'
import { DevoirsListe } from './devoirs/DevoirsListe.jsx'
import { QuizDetail } from './quiz/QuizDetail.jsx'
import { QuizFormulaire } from './quiz/QuizFormulaire.jsx'
import { QuizListe } from './quiz/QuizListe.jsx'
import { QuizPassation } from './quiz/QuizPassation.jsx'
import { TentativeDetail } from './quiz/TentativeDetail.jsx'
import { RessourcesListe } from './bibliotheque/RessourcesListe.jsx'
import { MediasListe } from './medias/MediasListe.jsx'
import { ActiviteApprenantPage } from './admin/ActiviteApprenantPage.jsx'
import { ParametresPage } from './admin/ParametresPage.jsx'
import { StatistiquesPage } from './admin/StatistiquesPage.jsx'
import { useProfilStore } from '../../context/elearning/profil.js'
import {
  ADMINISTRATION,
  APPRENANT,
  GESTION,
  SANS_PARENT,
} from '../../config/elearning/config.js'

/**
 * Garde de route du module : redirige vers l'accueil du module si le rôle
 * simulé n'est pas autorisé. La sécurité de référence reste celle de
 * l'API (en-tête X-Role vérifié par les permissions DRF) — ceci n'empêche
 * que d'afficher une page inutile.
 */
function RouteProtegee({ roles, children }) {
  const role = useProfilStore((etat) => etat.role)
  if (!roles.includes(role)) {
    return <Navigate to="/elearning/" replace />
  }
  return children
}

/**
 * Racine du module E-Learning, montée en route descendante sous
 * /elearning/* dans App.jsx. Accès en démonstration (stand-in des
 * claims JWT de la gateway) : rôle et tenant proviennent du profil
 * de démonstration persisté, les routes restent relatives au module.
 */
export default function ElearningApp() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Accueil />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="cours" element={<CoursListe />} />
        <Route
          path="cours/nouveau"
          element={
            <RouteProtegee roles={GESTION}>
              <CoursFormulaire />
            </RouteProtegee>
          }
        />
        <Route path="cours/:uuid" element={<CoursDetail />} />
        <Route
          path="cours/:uuid/modifier"
          element={
            <RouteProtegee roles={GESTION}>
              <CoursFormulaire />
            </RouteProtegee>
          }
        />
        <Route path="devoirs" element={<DevoirsListe />} />
        <Route
          path="devoirs/nouveau"
          element={
            <RouteProtegee roles={GESTION}>
              <DevoirFormulaire />
            </RouteProtegee>
          }
        />
        <Route path="devoirs/:uuid" element={<DevoirDetail />} />
        <Route
          path="quiz"
          element={
            <RouteProtegee roles={SANS_PARENT}>
              <QuizListe />
            </RouteProtegee>
          }
        />
        <Route
          path="quiz/nouveau"
          element={
            <RouteProtegee roles={GESTION}>
              <QuizFormulaire />
            </RouteProtegee>
          }
        />
        <Route
          path="quiz/:uuid"
          element={
            <RouteProtegee roles={SANS_PARENT}>
              <QuizDetail />
            </RouteProtegee>
          }
        />
        <Route
          path="quiz/:uuid/passer"
          element={
            <RouteProtegee roles={APPRENANT}>
              <QuizPassation />
            </RouteProtegee>
          }
        />
        <Route
          path="tentatives/:uuid"
          element={
            <RouteProtegee roles={SANS_PARENT}>
              <TentativeDetail />
            </RouteProtegee>
          }
        />
        <Route path="bibliotheque" element={<RessourcesListe />} />
        <Route
          path="medias"
          element={
            <RouteProtegee roles={GESTION}>
              <MediasListe />
            </RouteProtegee>
          }
        />
        <Route
          path="administration/statistiques"
          element={
            <RouteProtegee roles={GESTION}>
              <StatistiquesPage />
            </RouteProtegee>
          }
        />
        <Route
          path="administration/parametres"
          element={
            <RouteProtegee roles={ADMINISTRATION}>
              <ParametresPage />
            </RouteProtegee>
          }
        />
        <Route
          path="administration/apprenant"
          element={
            <RouteProtegee roles={GESTION}>
              <ActiviteApprenantPage />
            </RouteProtegee>
          }
        />
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  )
}
