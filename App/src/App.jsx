import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/commun/env'
import {
  FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, COMPTE_PATH,
  ADMIN_DASHBOARD_PATH, PORTAIL_PATH, DASHBOARD_TEMP_PATH,
} from './config/identite/routes'
import { ADMIN_PATHS, PATHS } from './config/etablissements/config'
import { SERVICE_PATHS } from './config/services/config'
import { BASE_ROUTE_ETABLISSEMENT, MODE_SOUS_DOMAINE, detecterSlugEtablissement } from './lib/etablissements/subdomain'
import { PublicOnly, RequireAuth } from './components/identite'
import RequireEtablissement from './components/identite/RequireEtablissement'

/* Pages publiques */
import AuthPage       from './pages/identite/AuthPage'
import DemandePage    from './pages/etablissements/DemandePage'
import CorrectionPage from './pages/etablissements/CorrectionPage'
import Home           from './pages/commun/Home'
import { ForbiddenPage, NotFoundPage } from './pages/commun/ErrorPages'

/* Pages communes */
import ComptePage    from './pages/commun/ComptePage'
import Portail       from './pages/commun/Portail'
import DashboardTemp from './pages/commun/DashboardTemp'

/* Espace d'établissement */
import AccueilEtablissement     from './pages/etablissements/AccueilEtablissement'
import ConfigurationPage        from './pages/etablissements/ConfigurationPage'
import ServiceEtablissementPage from './pages/etablissements/ServiceEtablissementPage'
import RedirectionPortail       from './pages/identite/RedirectionPortail'
import TransfertPage            from './pages/identite/TransfertPage'
import { VersConnexion, VersEtablissement } from './pages/commun/Redirections'

/* Layout portail établissement */
import PortailLayout from './components/commun/PortailLayout'

/* Tableaux de bord dédiés par rôle */
import DashboardApprenantPage from './pages/apprenants/DashboardApprenantPage'
import DashboardParentPage from './pages/parents/DashboardParentPage'
import DashboardPrestatairePage from './pages/prestataires/DashboardPrestatairePage'

/* Administration principale */
import AdminLayout               from './pages/AdministrationPrincipale/AdminLayout'
import Dashboard                 from './pages/AdministrationPrincipale/Dashboard'
import DemandesPage              from './pages/AdministrationPrincipale/DemandesPage'
import DemandeDetailPage         from './pages/AdministrationPrincipale/DemandeDetailPage'
import EtablissementsPage        from './pages/AdministrationPrincipale/EtablissementsPage'
import ServicesPage              from './pages/AdministrationPrincipale/ServicesPage'
import ServiceDetailPage         from './pages/AdministrationPrincipale/ServiceDetailPage'
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

  /* ── Sous-domaine d'un établissement ── */
  if (SLUG_HOTE) {
    return (
      <>
        <RateLimitModal />
        <TabConflictModal />
        <Routes>
          {routesEtablissement('')}
          <Route path={LOGIN_PATH} element={<VersConnexion />} />
          <Route element={<RequireEtablissement />}>
            <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
          </Route>
          <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </>
    )
  }

  /* ── Plateforme (domaine de base, ou application locale) ── */
  return (
    <>
      <RateLimitModal />
      <TabConflictModal />
      <Routes>
        {/* ── Visiteurs uniquement ── */}
        <Route element={<PublicOnly />}>
          <Route path={LOGIN_PATH} element={<AuthPage />} />
        </Route>

      {/* ── Onboarding public ── */}
      <Route path={PATHS.demande}         element={<DemandePage />} />
      <Route path={PATHS.correctionRoute} element={<CorrectionPage />} />

      {/* ── Espace d'établissement ── */}
      {MODE_SOUS_DOMAINE
        ? <Route path="/etablissements/:slug" element={<VersEtablissement />} />
        : routesEtablissement(BASE_ROUTE_ETABLISSEMENT)}

      {/* ── Accueil public ── */}
      <Route path={HOME_PATH} element={<Home />} />

      {/* ── Redirection intelligente post-login & Espaces Dédiés ── */}
      <Route element={<RequireEtablissement />}>
        <Route path={PORTAIL_PATH} element={<RedirectionPortail />} />
        <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
        <Route path="/apprenant/*" element={<DashboardApprenantPage />} />
        <Route path="/apprenants/*" element={<DashboardApprenantPage />} />
        <Route path="/parent/*" element={<DashboardParentPage />} />
        <Route path="/parents/*" element={<DashboardParentPage />} />
        <Route path="/prestataire/*" element={<DashboardPrestatairePage />} />
        <Route path="/prestataires/*" element={<DashboardPrestatairePage />} />
      </Route>

      {/* ── Administration : super_admin ── */}
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

      {/* ── E-Learning (module ajouté par fusion) ── */}
      <Route path="/elearning/*" element={<ElearningApp />} />

      {/* ── Erreurs ── */}
      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*"              element={<NotFoundPage />} />
    </Routes>
    </>
  )
}
