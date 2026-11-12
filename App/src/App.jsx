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

import AccueilEtablissement from './pages/etablissements/AccueilEtablissement'
import AdminLayout        from './pages/AdministrationPrincipale/AdminLayout'
import Dashboard          from './pages/AdministrationPrincipale/Dashboard'
import DemandesPage       from './pages/AdministrationPrincipale/DemandesPage'
import DemandeDetailPage  from './pages/AdministrationPrincipale/DemandeDetailPage'
import EtablissementsPage from './pages/AdministrationPrincipale/EtablissementsPage'
import ServicesPage from './pages/AdministrationPrincipale/ServicesPage'
import ServiceDetailPage from './pages/AdministrationPrincipale/ServiceDetailPage'
import EtablissementServicesPage from './pages/AdministrationPrincipale/EtablissementServicesPage'
import PaiementsStatsPage     from './pages/AdministrationPrincipale/paiements/PaiementsStatsPage'
import PaiementsAgregateurPage from './pages/AdministrationPrincipale/paiements/PaiementsAgregateurPage'
import PaiementsModesPage     from './pages/AdministrationPrincipale/paiements/PaiementsModesPage'
import PaiementsAccordsPage   from './pages/AdministrationPrincipale/paiements/PaiementsAccordsPage'
import PaiementsAuditPage     from './pages/AdministrationPrincipale/paiements/PaiementsAuditPage'

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
        <Route path="/apprenant/*" element={<DashboardApprenantPage />} />
        <Route path="/apprenants/*" element={<DashboardApprenantPage />} />
        <Route path="/parent/*" element={<DashboardParentPage />} />
        <Route path="/parents/*" element={<DashboardParentPage />} />
        <Route path="/prestataire/*" element={<DashboardPrestatairePage />} />
        <Route path="/prestataires/*" element={<DashboardPrestatairePage />} />
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
          {/* ── Paiements ── */}
          <Route path="/admin/paiements"                   element={<PaiementsStatsPage />} />
          <Route path="/admin/paiements/agregateurs"       element={<PaiementsAgregateurPage />} />
          <Route path="/admin/paiements/modes-paiement"    element={<PaiementsModesPage />} />
          <Route path="/admin/paiements/accords"           element={<PaiementsAccordsPage />} />
          <Route path="/admin/paiements/audit"             element={<PaiementsAuditPage />} />
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
    </>
  )
}
