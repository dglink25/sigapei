import { Route, Routes } from 'react-router'

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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="cours" element={<CoursListe />} />
        <Route path="cours/nouveau" element={<CoursFormulaire />} />
        <Route path="cours/:uuid" element={<CoursDetail />} />
        <Route path="cours/:uuid/modifier" element={<CoursFormulaire />} />
        <Route path="devoirs" element={<DevoirsListe />} />
        <Route path="devoirs/nouveau" element={<DevoirFormulaire />} />
        <Route path="devoirs/:uuid" element={<DevoirDetail />} />
        <Route path="quiz" element={<QuizListe />} />
        <Route path="quiz/nouveau" element={<QuizFormulaire />} />
        <Route path="quiz/:uuid" element={<QuizDetail />} />
        <Route path="quiz/:uuid/passer" element={<QuizPassation />} />
        <Route path="tentatives/:uuid" element={<TentativeDetail />} />
        <Route path="bibliotheque" element={<RessourcesListe />} />
        <Route path="medias" element={<MediasListe />} />
        <Route
          path="administration/statistiques"
          element={<StatistiquesPage />}
        />
        <Route path="administration/parametres" element={<ParametresPage />} />
        <Route
          path="administration/apprenant"
          element={<ActiviteApprenantPage />}
        />
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  )
}
