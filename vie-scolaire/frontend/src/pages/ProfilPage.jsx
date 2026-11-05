import { Link } from 'react-router'

import { PanneauProfil } from '../components/PanneauProfil.jsx'

export function ProfilPage() {
  return (
    <>
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        <Link to="/">Tableau de bord</Link>
        <span className="separateur" aria-hidden="true">/</span>
        <span aria-current="page">Profil &amp; Tenant</span>
      </nav>

      <div className="titre-page">
        <div>
          <h1>Profil &amp; Tenant</h1>
          <span className="badge badge-texte">Session de démonstration</span>
        </div>
      </div>

      <p className="texte-efface">
        L&#39;authentification SSO (JWT émis par le microservice Identité) n&#39;est
        pas encore branchée sur ce module. Ce profil tient lieu de session : il
        définit le tenant envoyé dans l&#39;en-tête X-Tenant-Id, le rôle simulé, le
        jeton CAPTCHA et les identifiants externes qui préremplissent filtres et
        formulaires (apprenant, classe, cours).
      </p>

      <PanneauProfil />
    </>
  )
}
