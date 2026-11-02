import { Link, NavLink, Outlet } from 'react-router'

import { Icone } from './Icone.jsx'
import { ROLES, useProfilStore } from '../stores/profil.js'

// Navigation latérale PC (icônes Material Symbols).
const NAVIGATION = [
  { vers: '/', libelle: 'Tableau de bord', exact: true, icone: 'dashboard' },
  { vers: '/presences', libelle: 'Présences & absences', icone: 'how_to_reg' },
  { vers: '/incidents', libelle: 'Incidents & sanctions', icone: 'gavel' },
  { vers: '/dossier', libelle: 'Dossier vie scolaire', icone: 'folder_shared' },
  { vers: '/alertes', libelle: 'Alertes absences', icone: 'notifications_active' },
]

// Onglets de la navigation basse mobile (actif = or).
const NAVIGATION_MOBILE = [
  { vers: '/', libelle: 'Accueil', exact: true, icone: 'home' },
  { vers: '/presences', libelle: 'Présences', icone: 'how_to_reg' },
  { vers: '/incidents', libelle: 'Incidents', icone: 'gavel' },
  { vers: '/dossier', libelle: 'Dossier', icone: 'folder_shared' },
  { vers: '/alertes', libelle: 'Alertes', icone: 'notifications_active' },
]

export function Layout() {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  const role = useProfilStore((etat) => etat.role)
  const majProfil = useProfilStore((etat) => etat.majProfil)
  const libelleRole =
    ROLES.find((element) => element.valeur === role)?.libelle ?? role

  return (
    <div className="application">
      {/* Barre latérale institutionnelle (PC) */}
      <aside className="barre-laterale">
        <Link to="/" className="marque">
          <span className="marque-logo" aria-hidden="true">
            VS
          </span>
          <span>
            SIGAPEI
            <small>Vie Scolaire</small>
          </span>
        </Link>

        <div className="carte-utilisateur">
          <Icone nom="school" />
          <span>
            <strong>Établissement</strong>
            <small className="texte-efface">
              {tenantId ? `tenant n°${tenantId}` : 'non configuré'}
            </small>
          </span>
        </div>

        <nav aria-label="Navigation principale">
          {NAVIGATION.map(({ vers, libelle, exact, icone }) => (
            <NavLink key={vers} to={vers} end={exact}>
              <Icone nom={icone} />
              {libelle}
            </NavLink>
          ))}
        </nav>

        <div className="barre-laterale-pied">
          <div className="carte-utilisateur">
            <span className="avatar">
              <Icone nom="person" />
            </span>
            <span>
              <strong>Profil démo</strong>
              <small className="texte-efface">{libelleRole}</small>
            </span>
          </div>
          <Link to="/profil">Profil &amp; Tenant</Link>
        </div>
      </aside>

      <div className="contenu-principal">
        {/* Barre supérieure (PC) */}
        <header className="topbar">
          <span
            className="badge-synchro"
            title="Le module consomme la base Neon partagée via la passerelle."
          >
            <Icone nom="cloud_done" classe="icone icone-sm" />
            Connecté
          </span>

          <div className="segmente" role="group" aria-label="Simulation de rôle">
            {ROLES.map(({ valeur, libelle }) => (
              <button
                key={valeur}
                type="button"
                className={
                  valeur === role
                    ? 'segmente-bouton segmente-actif'
                    : 'segmente-bouton'
                }
                onClick={() => majProfil({ role: valeur })}
              >
                {libelle}
              </button>
            ))}
          </div>

          <Link to="/profil" className="avatar" aria-label="Profil et tenant">
            <Icone nom="person" />
          </Link>
        </header>

        {/* En-tête mobile (< 768px) */}
        <header className="entete-mobile">
          <Link to="/" className="marque">
            <span className="marque-logo" aria-hidden="true">
              VS
            </span>
            <span>
              SIGAPEI
              <small>Vie Scolaire</small>
            </span>
          </Link>
          <span className="badge badge-role">{libelleRole}</span>
        </header>

        <main className="contenu">
          {!tenantId && (
            <div className="alerte alerte-avertissement" role="alert">
              Aucun tenant configuré : toutes les routes /v1/ exigent l&#39;en-tête
              X-Tenant-Id (identifiant numérique).{' '}
              <Link to="/profil">Configurer le profil de démonstration</Link>.
            </div>
          )}
          <Outlet />
        </main>

        {/* Navigation basse mobile */}
        <nav className="bottom-nav" aria-label="Navigation mobile">
          {NAVIGATION_MOBILE.map(({ vers, libelle, exact, icone }) => (
            <NavLink
              key={vers}
              to={vers}
              end={exact}
              className={({ isActive }) => (isActive ? 'actif' : undefined)}
            >
              <Icone nom={icone} />
              {libelle}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
