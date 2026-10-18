import { Link } from 'react-router-dom'

import { PanneauProfil } from '../../components/elearning/PanneauProfil.jsx'

export function ProfilPage() {
  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/elearning/">Tableau de Bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Profil & Tenant</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>Profil & Tenant</h1>
          <span className="badge badge-texte">Session de démonstration</span>
        </div>
      </div>

      <p className="texte-efface">
        L'authentification SSO (JWT émis par le microservice Identité)
        n'est pas encore branchée sur ce module. Ce profil tient lieu de
        session : il définit le tenant envoyé dans l'en-tête X-Tenant-ID,
        le rôle simulé et les identifiants externes qui préremplissent les
        formulaires (matière, classe, enseignant, apprenant).
      </p>

      <PanneauProfil />
    </>
  )
}
