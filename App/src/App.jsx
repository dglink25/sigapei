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

/* Administration principale */
import AdminLayout               from './pages/AdministrationPrincipale/AdminLayout'
import Dashboard                 from './pages/AdministrationPrincipale/Dashboard'
import DemandesPage              from './pages/AdministrationPrincipale/DemandesPage'
import DemandeDetailPage         from './pages/AdministrationPrincipale/DemandeDetailPage'
import EtablissementsPage        from './pages/AdministrationPrincipale/EtablissementsPage'
import ServicesPage              from './pages/AdministrationPrincipale/ServicesPage'
import ServiceDetailPage         from './pages/AdministrationPrincipale/ServiceDetailPage'
import EtablissementServicesPage from './pages/AdministrationPrincipale/EtablissementServicesPage'
import EtablissementRolesPage    from './pages/AdministrationPrincipale/EtablissementRolesPage'
import DemandesCyclePage         from './pages/AdministrationPrincipale/DemandesCyclePage'
import RolesPage                 from './pages/AdministrationPrincipale/RolesPage'
import DemandesRolePage          from './pages/AdministrationPrincipale/DemandesRolePage'
import UtilisateursPage          from './pages/AdministrationPrincipale/UtilisateursPage'

/* E-Learning (ajouté par fusion) */
import ElearningApp from './pages/elearning/ElearningApp'

/** Hôte d'un établissement (sous-domaine en production). */
const SLUG_HOTE = MODE_SOUS_DOMAINE ? detecterSlugEtablissement() : null

/**
 * Routes d'un établissement enveloppées dans PortailLayout.
 * base = '' sur un sous-domaine ; '/etablissements/:slug' en local.
 */
function routesEtablissement(base) {
  const p = (sub) => (base ? `${base}${sub}` : sub || '/')
  return (
    <>
      {/* ── Public : accueil de l'établissement ── */}
      <Route path={p('')} element={<AccueilEtablissement />} />
      <Route path={p('/auth/callback')} element={<TransfertPage />} />

      {/* ── Portail : page autonome sans sidebar ── */}
      <Route element={<RequireEtablissement />}>
        <Route path={p('/portail')} element={<Portail />} />
      </Route>

      {/* ── Services, compte, configuration : avec sidebar PortailLayout ── */}
      <Route element={<RequireEtablissement />}>
        <Route element={<PortailLayout />}>
          <Route path={p('/compte')} element={<ComptePage />} />
          <Route path={p('/:code/*')} element={<ServiceEtablissementPage />} />
        </Route>
      </Route>

      {/* ── Configuration : admin uniquement, aussi dans PortailLayout ── */}
      <Route element={<RequireAuth roles={['administrateur']} />}>
        <Route element={<PortailLayout />}>
          <Route path={p('/configuration')} element={<ConfigurationPage />} />
        </Route>
      </Route>
    </>
  )
}

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  /* ── Sous-domaine d'un établissement ── */
  if (SLUG_HOTE) {
    return (
      <Routes>
        {routesEtablissement('')}
        <Route path={LOGIN_PATH} element={<VersConnexion />} />
        <Route element={<RequireEtablissement />}>
          <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
        </Route>
        <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    )
  }

  /* ── Plateforme (domaine de base, ou application locale) ── */
  return (
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

      {/* ── Redirection intelligente post-login ── */}
      <Route element={<RequireEtablissement />}>
        <Route path={PORTAIL_PATH} element={<RedirectionPortail />} />
        <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
      </Route>

      {/* ── Administration : super_admin ── */}
      <Route element={<RequireAuth roles={['super_admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path={ADMIN_DASHBOARD_PATH}               element={<Dashboard />} />
          <Route path={COMPTE_PATH}                        element={<ComptePage />} />
          <Route path={ADMIN_PATHS.demandes}               element={<DemandesPage />} />
          <Route path={ADMIN_PATHS.detailRoute}            element={<DemandeDetailPage />} />
          <Route path={ADMIN_PATHS.etablissements}         element={<EtablissementsPage />} />
          <Route path={SERVICE_PATHS.etablissementRoute}   element={<EtablissementServicesPage />} />
          <Route path="/admin/etablissements/:uuid/roles"  element={<EtablissementRolesPage />} />
          <Route path={SERVICE_PATHS.liste}                element={<ServicesPage />} />
          <Route path={SERVICE_PATHS.detailRoute}          element={<ServiceDetailPage />} />
          <Route path="/admin/demandes-cycle"              element={<DemandesCyclePage />} />
          <Route path="/admin/roles"                       element={<RolesPage />} />
          <Route path="/admin/demandes-role"               element={<DemandesRolePage />} />
          <Route path="/admin/utilisateurs"                element={<UtilisateursPage />} />
        </Route>
      </Route>

      {/* ── E-Learning (module ajouté par fusion) ── */}
      <Route path="/elearning/*" element={<ElearningApp />} />

      {/* ── Erreurs ── */}
      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*"              element={<NotFoundPage />} />
    </Routes>
  )
}
