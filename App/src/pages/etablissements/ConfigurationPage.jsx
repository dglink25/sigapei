import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import AccesDroitsPanel from '../../components/etablissements/AccesDroitsPanel'
import InfosEtablissementPanel from '../../components/etablissements/InfosEtablissementPanel'
import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import '../AdministrationPrincipale/services.css'
import './ConfigurationPage.css'

const SECTIONS = [
  { id: 'droits', label: "Droits d'accès" },
  { id: 'utilisateurs', label: 'Utilisateurs', bientot: true },
  { id: 'roles', label: 'Rôles', bientot: true },
  { id: 'etablissement', label: "Informations de l'établissement" },
]

const SOUS_TITRES = {
  droits: 'Gérez les accès de vos utilisateurs aux services de votre établissement',
  etablissement: "Mettez à jour le logo, les types, l'adresse et la localisation de votre établissement",
}

/**
 * Panneau de configuration - réservé à l'administrateur de l'établissement.
 * Header/sidebar fournis par PortailLayout.
 */
export default function ConfigurationPage() {
  usePageTitle('Configuration')
  const slug = useSlugEtablissement()
  const [section, setSection] = useState('droits')
  const [etab, setEtab] = useState(null)

  useEffect(() => {
    let annule = false
    portailService.lire().then((r) => !annule && setEtab(r?.etablissement ?? null)).catch(() => {})
    return () => { annule = true }
  }, [])

  return (
    <div className="ap cfg">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={lienEtablissement(slug, '/portail')}>Portail</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>Configuration</span>
      </nav>

      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">Configuration{etab ? ` · ${etab.nom}` : ''}</h2>
          <p className="ap-page-sub">{SOUS_TITRES[section] ?? SOUS_TITRES.droits}</p>
        </div>
      </div>

      <div className="ap-filters" role="tablist" aria-label="Sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            disabled={s.bientot}
            title={s.bientot ? 'Bientôt disponible' : undefined}
            className={`ap-tab${section === s.id ? ' is-active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
            {s.bientot && <span>Bientôt</span>}
          </button>
        ))}
      </div>

      {section === 'droits' && <AccesDroitsPanel />}
      {section === 'etablissement' && <InfosEtablissementPanel />}
    </div>
  )
}