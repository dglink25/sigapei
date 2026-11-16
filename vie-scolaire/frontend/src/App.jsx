import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout.jsx'
import { Accueil } from './pages/Accueil.jsx'
import { PageIntrouvable } from './pages/PageIntrouvable.jsx'
import { ProfilPage } from './pages/ProfilPage.jsx'
import { AlertesAbsences } from './pages/alertes/AlertesAbsences.jsx'
import { DossierVieScolaire } from './pages/dossier/DossierVieScolaire.jsx'
import { IncidentFormulaire } from './pages/incidents/IncidentFormulaire.jsx'
import { IncidentsListe } from './pages/incidents/IncidentsListe.jsx'
import { PresenceSaisie } from './pages/presences/PresenceSaisie.jsx'
import { PresencesListe } from './pages/presences/PresencesListe.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="profil" element={<ProfilPage />} />

        <Route path="presences" element={<PresencesListe />} />
        <Route path="presences/nouvelle" element={<PresenceSaisie />} />

        <Route path="incidents" element={<IncidentsListe />} />
        <Route path="incidents/nouveau" element={<IncidentFormulaire />} />

        <Route path="apprenants/:uuid/dossier" element={<DossierVieScolaire />} />

        <Route path="alertes" element={<AlertesAbsences />} />

        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  )
}
