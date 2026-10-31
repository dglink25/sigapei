import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Icone } from './Icone.jsx'
import { ROLES, useProfilStore } from '../../context/elearning/profil.js'
import { ADMINISTRATION, ELEVES, GESTION, SANS_PARENT } from '../../config/elearning/config.js'
import { syncProfilDepuisIdentite } from '../../context/elearning/profil.js'
import ThemeToggle from '../commun/ThemeToggle.jsx'

// Rôles autorisés par entrée (bilan RBAC validé) : pas de `roles` =
// tous les rôles. L'apprenant et le parent ne voient ni Médias, ni
// Statistiques & Admin, ni Paramètres ; le parent n'a pas les quiz.
// Groupes de rôles centralisés dans config/elearning/config.js.

function estAutorise(entree, role) {
  return !entree.roles || entree.roles.includes(role)
}

// Navigation latérale PC & administration (icônes Material Symbols).
const NAVIGATION = [
  {
    vers: '/elearning/',
    libelle: 'Tableau de Bord',
    exact: true,
    icone: 'dashboard',
  },
  { vers: '/elearning/cours', libelle: 'Cours & Syllabus', icone: 'menu_book' },
  { vers: '/elearning/devoirs', libelle: 'Devoirs & Évaluations', icone: 'assignment' },
  { vers: '/elearning/quiz', libelle: 'Quiz & QCM', icone: 'quiz', roles: SANS_PARENT },
  {
    vers: '/elearning/administration/statistiques',
    libelle: 'Statistiques & Admin',
    icone: 'monitoring',
    roles: GESTION,
  },
  { vers: '/elearning/bibliotheque', libelle: 'Bibliothèque', icone: 'local_library' },
  { vers: '/elearning/medias', libelle: 'Médias', icone: 'video_library', roles: GESTION },
  {
    vers: '/elearning/administration/parametres',
    libelle: 'Paramètres',
    icone: 'settings',
    roles: ADMINISTRATION,
  },
]

// Onglets de la navigation basse mobile (5 entrées, actif = or). La
// Bibliothèque remplace l'onglet Admin pour les rôles apprenant/parent,
// qui n'ont pas accès aux pages d'administration.
const NAVIGATION_MOBILE = [
  { vers: '/elearning/', libelle: 'Accueil', exact: true, icone: 'home' },
  { vers: '/elearning/cours', libelle: 'Cours', icone: 'menu_book' },
  { vers: '/elearning/devoirs', libelle: 'Devoirs', icone: 'assignment' },
  { vers: '/elearning/quiz', libelle: 'Quiz', icone: 'quiz', roles: SANS_PARENT },
  {
    vers: '/elearning/administration/statistiques',
    libelle: 'Admin',
    icone: 'admin_panel_settings',
    roles: GESTION,
  },
  {
    vers: '/elearning/bibliotheque',
    libelle: 'Bibliothèque',
    icone: 'local_library',
    roles: ELEVES,
  },
]

const ANNEES_SCOLAIRES = ['2024-2025', '2025-2026', '2026-2027']
const TRIMESTRES = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3']

export function Layout() {
  const tenantId = useProfilStore((etat) => etat.tenantId)
  const role = useProfilStore((etat) => etat.role)
  const majProfil = useProfilStore((etat) => etat.majProfil)
  const libelleRole =
    ROLES.find((element) => element.valeur === role)?.libelle ?? role

  // Synchronise le profil elearning avec la session identite (tenant_id, role)
  // au montage, pour ne pas avoir a saisir le tenant ni le role a la main.
  useEffect(() => {
    const synchro = syncProfilDepuisIdentite()
    if (synchro && (!tenantId || synchro.role !== role)) {
      majProfil(synchro)
    }
  }, [majProfil, tenantId, role])

  // Contexte scolaire de démonstration (aucune API ne les persiste).
  const [annee, setAnnee] = useState('2025-2026')
  const [trimestre, setTrimestre] = useState('Trimestre 1')

  return (
    <div className="el-app">
      {/* Barre latérale institutionnelle (PC) */}
      <aside className="barre-laterale">
        <Link to="/elearning/" className="marque">
          <span className="marque-logo" aria-hidden="true">
            S
          </span>
          <span>
            SIGAPEI
            <small>E-Learning · E-Académique</small>
          </span>
        </Link>

        <div className="carte-utilisateur">
          <Icone nom="school" />
          <span>
            <strong>Établissement</strong>
            <small className="texte-efface">
              {tenantId ? `${tenantId.slice(0, 8)}…` : 'non configuré'}
            </small>
          </span>
        </div>

        <nav aria-label="Navigation principale">
          {NAVIGATION.filter((entree) => estAutorise(entree, role)).map(
            ({ vers, libelle, exact, icone }) => (
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
          <div style={{ padding: '6px 0' }}>
            <ThemeToggle variant="pill" />
          </div>
          <Link to="/elearning/profil">Profil & Tenant</Link>
        </div>
      </aside>

      <div className="contenu-principal">
        {/* Barre supérieure (PC) */}
        <header className="topbar">
          <span
            className="badge-synchro"
            title="Synchronisation DREN : hors périmètre E-learning (décoratif)"
          >
            <Icone nom="cloud_done" classe="icone icone-sm" />
            Synchronisé
          </span>

          <label className="champ-inline">
            <span className="texte-efface">Année</span>
            <select
              className="select-compact"
              value={annee}
              onChange={(evenement) => setAnnee(evenement.target.value)}
            >
              {ANNEES_SCOLAIRES.map((valeur) => (
                <option key={valeur}>{valeur}</option>
              ))}
            </select>
          </label>

          <label className="champ-inline">
            <span className="texte-efface">Trimestre</span>
            <select
              className="select-compact"
              value={trimestre}
              onChange={(evenement) => setTrimestre(evenement.target.value)}
            >
              {TRIMESTRES.map((valeur) => (
                <option key={valeur}>{valeur}</option>
              ))}
            </select>
          </label>

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

          <ThemeToggle className="tt-icon" />

          <Link to="/elearning/profil" className="avatar" aria-label="Profil et tenant">
            <Icone nom="person" />
          </Link>
        </header>

        {/* Bannière d'identité : rôle et tenant actifs */}
        <div className="alerte alerte-info" role="status">
          <span className="texte-efface">Connecté en tant que</span>
          <strong>{libelleRole}</strong>
          {tenantId ? (
            <>
              <span className="texte-efface">·</span>
              <span className="texte-efface">Tenant :</span>
              <code className="police-mono">
                {tenantId.slice(0, 8)}…
              </code>
            </>
          ) : (
            <span className="texte-efface">· Tenant : aucun (super_admin)</span>
          )}
        </div>

        {/* En-tête mobile (< 768px) */}
        <header className="entete-mobile">
          <Link to="/elearning/" className="marque">
            <span className="marque-logo" aria-hidden="true">
              S
            </span>
            <span>
              SIGAPEI
              <small>E-Learning · E-Académique</small>
            </span>
          </Link>
          <span className="badge badge-role">{libelleRole}</span>
        </header>

        <main className="contenu">
          {!tenantId && role !== 'super_admin' && (
            <div className="alerte alerte-avertissement" role="alert">
              Aucun tenant configuré : toutes les routes /v1/ exigent l'en-tête
              X-Tenant-ID.{' '}
              <Link to="/elearning/profil">Configurer le profil de démonstration</Link>.
            </div>
          )}
          <Outlet />
        </main>

        {/* Navigation basse mobile (5 onglets) */}
        <nav className="bottom-nav" aria-label="Navigation mobile">
          {NAVIGATION_MOBILE.filter((entree) => estAutorise(entree, role)).map(
            ({ vers, libelle, exact, icone }) => (
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
