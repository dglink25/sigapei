import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ENV } from './config/commun/env'
import {
  FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, SECURITY_PATH, COMPTE_PATH,
  ADMIN_DASHBOARD_PATH, PORTAIL_PATH, DASHBOARD_TEMP_PATH,
  PORTAIL_ROLES, NON_ADMIN_ROLES
} from './config/identite/routes'
import { ADMIN_PATHS, PATHS } from './config/etablissements/config'
import { SERVICE_PATHS } from './config/services/config'
import { PublicOnly, RequireAuth } from './components/identite'

/* Pages publiques */
import AuthPage       from './pages/identite/AuthPage'
import SecuritePage   from './pages/identite/SecuritePage'
import DemandePage    from './pages/etablissements/DemandePage'
import CorrectionPage from './pages/etablissements/CorrectionPage'
import Home           from './pages/commun/Home'
import { ForbiddenPage, NotFoundPage } from './pages/commun/ErrorPages'

/* Pages communes */
import ComptePage    from './pages/commun/ComptePage'
import Portail       from './pages/commun/Portail'
import DashboardTemp from './pages/commun/DashboardTemp'

import AccueilEtablissement from './pages/etablissements/AccueilEtablissement'
import AdminLayout        from './pages/AdministrationPrincipale/AdminLayout'
import Dashboard          from './pages/AdministrationPrincipale/Dashboard'
import DemandesPage       from './pages/AdministrationPrincipale/DemandesPage'
import DemandeDetailPage  from './pages/AdministrationPrincipale/DemandeDetailPage'
import EtablissementsPage from './pages/AdministrationPrincipale/EtablissementsPage'
import ServicesPage from './pages/AdministrationPrincipale/ServicesPage'
import ServiceDetailPage from './pages/AdministrationPrincipale/ServiceDetailPage'
import EtablissementServicesPage from './pages/AdministrationPrincipale/EtablissementServicesPage'

/* Vie scolaire */
import VieScolaireLayout from './pages/vie-scolaire/VieScolaireLayout'
import PresencesPage from './pages/vie-scolaire/PresencesPage'
import PresenceSaisiePage from './pages/vie-scolaire/PresenceSaisiePage'
import IncidentsPage from './pages/vie-scolaire/IncidentsPage'
import IncidentNouveauPage from './pages/vie-scolaire/IncidentNouveauPage'
import DossierPage from './pages/vie-scolaire/DossierPage'
import AlertesPage from './pages/vie-scolaire/AlertesPage'
import { PATHS as VS_PATHS } from './config/vie-scolaire/config'

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  return (
    <Routes>
      {/* ── Visiteurs uniquement ── */}
      <Route element={<PublicOnly />}>
        <Route path={LOGIN_PATH} element={<AuthPage />} />
      </Route>

      {/* ── Onboarding public ── */}
      <Route path={PATHS.demande}         element={<DemandePage />} />
      <Route path={PATHS.correctionRoute} element={<CorrectionPage />} />

      {/* ── Page d'accueil publique d'un établissement ── */}
      <Route path="/etablissements/:slug" element={<AccueilEtablissement />} />

      {/* ── Accueil public ── */}
      <Route path={HOME_PATH} element={<Home />} />

      {/* ── Sécurité rétrocompat (sans layout) ── */}
      <Route element={<RequireAuth />}>
        <Route path={SECURITY_PATH} element={<SecuritePage />} />
      </Route>

      {/* ── Portail : rôles portail uniquement ── */}
      <Route element={<RequireAuth roles={PORTAIL_ROLES} />}>
        <Route path={PORTAIL_PATH} element={<Portail />} />
      </Route>

      {/* ── Dashboard temporaire ── */}
      <Route element={<RequireAuth roles={NON_ADMIN_ROLES} />}>
        <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
      </Route>

      {/* ── Administration : super_admin - /compte dans le layout admin ── */}
      <Route element={<RequireAuth roles={['super_admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path={ADMIN_DASHBOARD_PATH}       element={<Dashboard />} />
          <Route path={COMPTE_PATH}                 element={<ComptePage />} />
          <Route path={ADMIN_PATHS.demandes}        element={<DemandesPage />} />
          <Route path={ADMIN_PATHS.detailRoute}     element={<DemandeDetailPage />} />
          <Route path={ADMIN_PATHS.etablissements}  element={<EtablissementsPage />} />
          <Route path={SERVICE_PATHS.etablissementRoute} element={<EtablissementServicesPage />} />
          <Route path={SERVICE_PATHS.liste}         element={<ServicesPage />} />
          <Route path={SERVICE_PATHS.detailRoute}   element={<ServiceDetailPage />} />
        </Route>
      </Route>

      {/* ── Vie scolaire ── */}
      <Route element={<RequireAuth />}>
        <Route path={VS_PATHS.base} element={<VieScolaireLayout />}>
          <Route index element={<Navigate to={VS_PATHS.presences} replace />} />
          <Route path="presences" element={<PresencesPage />} />
          <Route path="presences/nouvelle" element={<PresenceSaisiePage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/nouveau" element={<IncidentNouveauPage />} />
          <Route path="alertes" element={<AlertesPage />} />
          <Route path="apprenants/:uuid/dossier" element={<DossierPage />} />
        </Route>
      </Route>

      {/* ── Erreurs ── */}
      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*"              element={<NotFoundPage />} />
    </Routes>
  )
}
