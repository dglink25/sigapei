import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/commun/env'
import { FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, SECURITY_PATH, ADMIN_DASHBOARD_PATH, PORTAIL_PATH, DASHBOARD_TEMP_PATH } from './config/identite/routes'
import { ADMIN_PATHS, ADMIN_ROLES, PATHS } from './config/etablissements/config'
import { PublicOnly, RequireAuth } from './components/identite'
import AuthPage from './pages/identite/AuthPage'
import SecuritePage from './pages/identite/SecuritePage'
import DemandePage from './pages/etablissements/DemandePage'
import CorrectionPage from './pages/etablissements/CorrectionPage'
import DemandesPage from './pages/etablissements/admin/DemandesPage'
import DemandeDetailPage from './pages/etablissements/admin/DemandeDetailPage'
import Dashboard from './pages/AdministrationPrincipale/Dashboard'
import Portail from './pages/commun/Portail'
import DashboardTemp from './pages/commun/DashboardTemp'
import Home from './pages/commun/Home'
import { ForbiddenPage, NotFoundPage } from './pages/commun/ErrorPages'

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  return (
    <Routes>
      {/* Visiteurs uniquement */}
      <Route element={<PublicOnly />}>
        <Route path={LOGIN_PATH} element={<AuthPage />} />
      </Route>

      {/* Onboarding public */}
      <Route path={PATHS.demande} element={<DemandePage />} />
      <Route path={PATHS.correctionRoute} element={<CorrectionPage />} />

      {/* Accueil public */}
      <Route path={HOME_PATH} element={<Home />} />

      {/* Routes protégées communes */}
      <Route element={<RequireAuth />}>
        <Route path={SECURITY_PATH}      element={<SecuritePage />} />
        <Route path={PORTAIL_PATH}        element={<Portail />} />
        <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
      </Route>

      {/* Dashboard Super Admin */}
      <Route element={<RequireAuth roles={['super_admin']} />}>
        <Route path={ADMIN_DASHBOARD_PATH} element={<Dashboard />} />
      </Route>

      {/* Back-office Super Administrateur */}
      <Route element={<RequireAuth roles={ADMIN_ROLES} />}>
        <Route path={ADMIN_PATHS.demandes}    element={<DemandesPage />} />
        <Route path={ADMIN_PATHS.detailRoute} element={<DemandeDetailPage />} />
      </Route>

      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
