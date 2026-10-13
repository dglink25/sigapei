import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/commun/env'
import { FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, SECURITY_PATH } from './config/identite/routes'
import { ADMIN_PATHS, ADMIN_ROLES, PATHS } from './config/etablissements/config'
import { PublicOnly, RequireAuth } from './components/identite'
import AuthPage from './pages/identite/AuthPage'
import SecuritePage from './pages/identite/SecuritePage'
import DemandePage from './pages/etablissements/DemandePage'
import CorrectionPage from './pages/etablissements/CorrectionPage'
import DemandesPage from './pages/etablissements/admin/DemandesPage'
import DemandeDetailPage from './pages/etablissements/admin/DemandeDetailPage'
import Home from './pages/commun/Home'
import { ForbiddenPage, NotFoundPage } from './pages/commun/ErrorPages'

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  return (
    <Routes>
      {/* Visiteurs uniquement : un utilisateur connecte est renvoye vers l'application */}
      <Route element={<PublicOnly />}>
        <Route path={LOGIN_PATH} element={<AuthPage />} />
      </Route>

      {/* Etablissements : onboarding public, sans authentification */}
      <Route path={PATHS.demande} element={<DemandePage />} />
      <Route path={PATHS.correctionRoute} element={<CorrectionPage />} />

      {/* Routes protegees : sans session -> redirection automatique vers /login */}
      <Route element={<RequireAuth />}>
        <Route path={HOME_PATH} element={<Home />} />
        <Route path={SECURITY_PATH} element={<SecuritePage />} />
      </Route>

      {/* Back-office Super Administrateur */}
      <Route element={<RequireAuth roles={ADMIN_ROLES} />}>
        <Route path={ADMIN_PATHS.demandes} element={<DemandesPage />} />
        <Route path={ADMIN_PATHS.detailRoute} element={<DemandeDetailPage />} />
      </Route>

      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
