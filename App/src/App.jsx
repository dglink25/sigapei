import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/commun/env'
import {
  FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, COMPTE_PATH,
  ADMIN_DASHBOARD_PATH, PORTAIL_PATH, DASHBOARD_TEMP_PATH,
  SECURITY_PATH,
} from './config/identite/routes'
import { ADMIN_PATHS, PATHS } from './config/etablissements/config'
import { SERVICE_PATHS } from './config/services/config'
import {
  BASE_ROUTE_ETABLISSEMENT, MODE_SOUS_DOMAINE, detecterSlugEtablissement,
} from './lib/etablissements/subdomain'
import { PublicOnly, RequireAuth } from './components/identite'
import RequireEtablissement from './components/identite/RequireEtablissement'
import RateLimitModal   from './components/securite/RateLimitModal'
import TabConflictModal from './components/securite/TabConflictModal'

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
import SecuritePage  from './pages/identite/SecuritePage'

/* Espace établissement — accueil public multi-pages */
import AccueilLayout    from './pages/etablissements/accueil/AccueilLayout'
import PagePresentation from './pages/etablissements/accueil/PagePresentation'
import PageFormations   from './pages/etablissements/accueil/PageFormations'
import PageActualites   from './pages/etablissements/accueil/PageActualites'
import PageGalerie      from './pages/etablissements/accueil/PageGalerie'
import PageContact      from './pages/etablissements/accueil/PageContact'

/* Espace établissement — portail & services */
import ConfigurationPage        from './pages/etablissements/ConfigurationPage'
import ServiceEtablissementPage from './pages/etablissements/ServiceEtablissementPage'
import RedirectionPortail       from './pages/identite/RedirectionPortail'
import TransfertPage            from './pages/identite/TransfertPage'
import { VersConnexion, VersEtablissement } from './pages/commun/Redirections'

/* Layout portail établissement */
import PortailLayout from './components/commun/PortailLayout'

/* Tableaux de bord dédiés par rôle */
import DashboardApprenantPage   from './pages/apprenants/DashboardApprenantPage'
import DashboardParentPage      from './pages/parents/DashboardParentPage'
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
import EtablissementRolesPage    from './pages/AdministrationPrincipale/EtablissementRolesPage'
import DemandesCyclePage         from './pages/AdministrationPrincipale/DemandesCyclePage'
import RolesPage                 from './pages/AdministrationPrincipale/RolesPage'
import DemandesRolePage          from './pages/AdministrationPrincipale/DemandesRolePage'
import DemandesServicePage       from './pages/AdministrationPrincipale/DemandesServicePage'
import UtilisateursPage          from './pages/AdministrationPrincipale/UtilisateursPage'
import PaiementsStatsPage        from './pages/AdministrationPrincipale/paiements/PaiementsStatsPage'
import PaiementsAgregateurPage   from './pages/AdministrationPrincipale/paiements/PaiementsAgregateurPage'
import PaiementsModesPage        from './pages/AdministrationPrincipale/paiements/PaiementsModesPage'
import PaiementsAccordsPage      from './pages/AdministrationPrincipale/paiements/PaiementsAccordsPage'
import PaiementsAuditPage        from './pages/AdministrationPrincipale/paiements/PaiementsAuditPage'

/* E-Learning */
import ElearningApp from './pages/elearning/ElearningApp'

import Loader from './components/commun/Loader'

/* Modules avec layout propre (lazy) */
const ScolaritePage               = lazy(() => import('./pages/etablissements/ScolaritePage'))
const InscriptionPage             = lazy(() => import('./pages/inscription/InscriptionPage'))
const EvaluationsPage             = lazy(() => import('./pages/evaluations/EvaluationsPage'))
const DemandesAdministrativesPage = lazy(() => import('./pages/demandes/DemandesPage'))
const FinancesPage                = lazy(() => import('./pages/finances/FinancesPage'))

function ScolariteDirecte() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader mode="inline" label="Ouverture de Scolarité…" /></div>}>
      <ScolaritePage />
    </Suspense>
  )
}

function InscriptionDirecte() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader mode="inline" label="Ouverture des Inscriptions…" /></div>}>
      <InscriptionPage />
    </Suspense>
  )
}

/** Accès direct à un module qui gère sa propre mise en page (sans PortailLayout). */
function ModuleDirect({ page: Page, nom }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader mode="inline" label={`Ouverture : ${nom}…`} /></div>}>
      <Page />
    </Suspense>
  )
}

/** Hôte d'un établissement (sous-domaine en production). */
const SLUG_HOTE = MODE_SOUS_DOMAINE ? detecterSlugEtablissement() : null

/**
 * Routes d'un établissement.
 * base = '' sur un sous-domaine ; '/etablissements/:slug' en local.
 */
function routesEtablissement(base) {
  const p = (sub) => (base ? `${base}${sub}` : sub || '/')
  return (
    <>
      {/* ── Accueil public multi-pages ── */}
      <Route element={<AccueilLayout />}>
        <Route path={p('')}            element={<PagePresentation />} />
        <Route path={p('/formations')} element={<PageFormations />} />
        <Route path={p('/actualites')} element={<PageActualites />} />
        <Route path={p('/galerie')}    element={<PageGalerie />} />
        <Route path={p('/contact')}    element={<PageContact />} />
      </Route>
      <Route path={p('/auth/callback')} element={<TransfertPage />} />

      {/* ── Portail : page autonome sans sidebar ── */}
      <Route element={<RequireEtablissement />}>
        <Route path={p('/portail')} element={<Portail />} />
      </Route>

      {/* ── Modules avec leur propre layout ── */}
      <Route element={<RequireEtablissement />}>
        <Route path={p('/scolarite/*')}    element={<ScolariteDirecte />} />
        <Route path={p('/inscription/*')}  element={<InscriptionDirecte />} />
        <Route path={p('/evaluations/*')}  element={<ModuleDirect page={EvaluationsPage} nom="Évaluations" />} />
        <Route path={p('/demandes/*')}     element={<ModuleDirect page={DemandesAdministrativesPage} nom="Demandes administratives" />} />
        <Route path={p('/finances/*')}     element={<ModuleDirect page={FinancesPage} nom="Finances" />} />
        <Route path={p('/apprenant/*')}    element={<DashboardApprenantPage />} />
        <Route path={p('/apprenants/*')}   element={<DashboardApprenantPage />} />
        <Route path={p('/parent/*')}       element={<DashboardParentPage />} />
        <Route path={p('/parents/*')}      element={<DashboardParentPage />} />
        <Route path={p('/prestataire/*')}  element={<DashboardPrestatairePage />} />
        <Route path={p('/prestataires/*')} element={<DashboardPrestatairePage />} />
      </Route>

      {/* ── Services + compte : dans PortailLayout ── */}
      <Route element={<RequireEtablissement />}>
        <Route element={<PortailLayout />}>
          <Route path={p('/compte')}  element={<ComptePage />} />
          <Route path={p('/:code/*')} element={<ServiceEtablissementPage />} />
        </Route>
      </Route>

      {/* ── Configuration : admin uniquement, dans PortailLayout ── */}
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

  /* ── Sous-domaine d'un établissement (production) ── */
  if (SLUG_HOTE && MODE_SOUS_DOMAINE) {
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

  /* ── Plateforme (domaine de base / local) ── */
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

        {/* ── Espace établissement ── */}
        {MODE_SOUS_DOMAINE
          ? <Route path="/etablissements/:slug" element={<VersEtablissement />} />
          : routesEtablissement(BASE_ROUTE_ETABLISSEMENT)
        }

        {/* ── Accueil public ── */}
        <Route path={HOME_PATH} element={<Home />} />

        {/* ── Sécurité ── */}
        <Route element={<RequireAuth />}>
          <Route path={SECURITY_PATH} element={<SecuritePage />} />
        </Route>

        {/* ── Redirection intelligente post-login & Espaces Dédiés ── */}
        <Route element={<RequireEtablissement />}>
          <Route path={PORTAIL_PATH}        element={<RedirectionPortail />} />
          <Route path={DASHBOARD_TEMP_PATH} element={<DashboardTemp />} />
          <Route path="/apprenant/*"        element={<DashboardApprenantPage />} />
          <Route path="/apprenants/*"       element={<DashboardApprenantPage />} />
          <Route path="/parent/*"           element={<DashboardParentPage />} />
          <Route path="/parents/*"          element={<DashboardParentPage />} />
          <Route path="/prestataire/*"      element={<DashboardPrestatairePage />} />
          <Route path="/prestataires/*"     element={<DashboardPrestatairePage />} />
        </Route>

        {/* ── Administration super_admin ── */}
        <Route element={<RequireAuth roles={['super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path={ADMIN_DASHBOARD_PATH}              element={<Dashboard />} />
            <Route path={COMPTE_PATH}                       element={<ComptePage />} />
            <Route path={ADMIN_PATHS.demandes}              element={<DemandesPage />} />
            <Route path={ADMIN_PATHS.detailRoute}           element={<DemandeDetailPage />} />
            <Route path={ADMIN_PATHS.etablissements}        element={<EtablissementsPage />} />
            <Route path={SERVICE_PATHS.etablissementRoute}  element={<EtablissementServicesPage />} />
            <Route path="/admin/etablissements/:uuid/roles" element={<EtablissementRolesPage />} />
            <Route path={SERVICE_PATHS.liste}               element={<ServicesPage />} />
            <Route path={SERVICE_PATHS.detailRoute}         element={<ServiceDetailPage />} />
            <Route path="/admin/demandes-cycle"             element={<DemandesCyclePage />} />
            <Route path="/admin/roles"                      element={<RolesPage />} />
            <Route path="/admin/demandes-role"              element={<DemandesRolePage />} />
            <Route path="/admin/demandes-service"           element={<DemandesServicePage />} />
            <Route path="/admin/utilisateurs"               element={<UtilisateursPage />} />
            {/* Paiements */}
            <Route path="/admin/paiements"                  element={<PaiementsStatsPage />} />
            <Route path="/admin/paiements/agregateurs"      element={<PaiementsAgregateurPage />} />
            <Route path="/admin/paiements/modes-paiement"   element={<PaiementsModesPage />} />
            <Route path="/admin/paiements/accords"          element={<PaiementsAccordsPage />} />
            <Route path="/admin/paiements/audit"            element={<PaiementsAuditPage />} />
          </Route>
        </Route>

        {/* ── E-Learning ── */}
        <Route path="/elearning/*" element={<ElearningApp />} />

        {/* ── Erreurs ── */}
        <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
        <Route path="*"              element={<NotFoundPage />} />

      </Routes>
    </>
  )
}
