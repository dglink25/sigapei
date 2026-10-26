import { Link } from 'react-router-dom'

import { Icone } from '../../components/elearning/Icone.jsx'

export function PageIntrouvable() {
  return (
    <div className="carte formulaire" style={{ textAlign: 'center' }}>
      <span className="kpi-icone" style={{ margin: '0 auto' }}>
        <Icone nom="search_off" />
      </span>
      <h1 style={{ marginTop: '0.75rem' }}>Page introuvable</h1>
      <p className="texte-efface">
        Cette page n'existe pas (ou plus). Vérifiez l'adresse ou revenez au
        tableau de bord.
      </p>
      <Link to="/elearning/" className="bouton bouton-primaire">
        <Icone nom="home" />
        Retourner à l'accueil
      </Link>
    </div>
  )
}
