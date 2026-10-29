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
import EtablissementRolesPage    from './pages/AdministrationPrincipale/EtablissementRolesPage'
import DemandesCyclePage         from './pages/AdministrationPrincipale/DemandesCyclePage'
import RolesPage                 from './pages/AdministrationPrincipale/RolesPage'
import DemandesRolePage          from './pages/AdministrationPrincipale/DemandesRolePage'
import DemandesServicePage       from './pages/AdministrationPrincipale/DemandesServicePage'
import UtilisateursPage          from './pages/AdministrationPrincipale/UtilisateursPage'

/* E-Learning (ajouté par fusion) */
import ElearningApp from './pages/elearning/ElearningApp'

/* Modales de sécurité globale */
import RateLimitModal from './components/securite/RateLimitModal'
import TabConflictModal from './components/securite/TabConflictModal'

import { Suspense, lazy } from 'react'
import Loader from './components/commun/Loader'

/* Modules avec layout propre (chargement direct sans PortailLayout) */
const ScolaritePage = lazy(() => import('./pages/etablissements/ScolaritePage'))
const InscriptionPage = lazy(() => import('./pages/inscription/InscriptionPage'))

/** Wrapper direct pour Scolarité (sans PortailLayout). */
function ScolariteDirecte() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader mode="inline" label="Ouverture de Scolarité…" /></div>}>
      <ScolaritePage />
    </Suspense>
  )
}

/** Wrapper direct pour Inscription (sans PortailLayout). */
function InscriptionDirecte() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader mode="inline" label="Ouverture des Inscriptions…" /></div>}>
      <InscriptionPage />
    </Suspense>
  )
}

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

      {/* ── Modules avec leur propre layout (sidebar dédiée) ── */}
      {/* Scolarité, Inscription et Espaces Métiers Dédiés (Apprenants, Parents, Prestataires) */}
      <Route element={<RequireEtablissement />}>
        <Route path={p('/scolarite/*')} element={<ScolariteDirecte />} />
        <Route path={p('/inscription/*')} element={<InscriptionDirecte />} />
        <Route path={p('/apprenant/*')} element={<DashboardApprenantPage />} />
        <Route path={p('/apprenants/*')} element={<DashboardApprenantPage />} />
        <Route path={p('/parent/*')} element={<DashboardParentPage />} />
        <Route path={p('/parents/*')} element={<DashboardParentPage />} />
        <Route path={p('/prestataire/*')} element={<DashboardPrestatairePage />} />
        <Route path={p('/prestataires/*')} element={<DashboardPrestatairePage />} />
      </Route>

      {/* ── Services sans layout propre + compte + configuration : dans PortailLayout ── */}
      <Route element={<RequireEtablissement />}>
        <Route element={<PortailLayout />}>
          <Route path={p('/compte')} element={<ComptePage />} />
          {/* Exclure les modules avec layout propre via le wildcard /:code/* */}
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
          <Route path="/admin/demandes-service"            element={<DemandesServicePage />} />
          <Route path="/admin/utilisateurs"                element={<UtilisateursPage />} />
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
