import { Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { iconePourCode } from '../../config/services/config'
import { composantService } from '../../config/services/registre'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import Loader from '../../components/commun/Loader'
import '../commun/Portail.css'

/**
 * Affiche le contenu d'un service.
 * Si le composant est enregistré → rendu direct.
 * Sinon → écran "Bientôt disponible".
 * Les services avec avecLayout:true gèrent leur propre layout en interne.
 */
function ServiceContenu({ service, Icone, slug }) {
  const Composant = composantService(service.code)
  if (Composant) {
    return (
      <Suspense fallback={<Loader mode="inline" label="Chargement du service…" />}>
        <Composant service={service} />
      </Suspense>
    )
  }
  return (
    <div className="portail-etat" role="status">
      <Icone size={40} aria-hidden="true" />
      <h2>{service.nom}</h2>
      <p>
        {service.description || 'Ce service'} sera disponible très prochainement.
        Vous y avez déjà accès : il s'ouvrira ici dès son activation.
      </p>
      <span className="portail-card-soon">
        <Construction size={12} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> Bientôt disponible
      </span>
      <Link to={lienEtablissement(slug, '/portail')} className="portail-card-btn">
        <ArrowLeft size={14} aria-hidden="true" /> Retour au portail
      </Link>
    </div>
  )
}

/**
 * Page d'un service.
 * Vérifie l'accès via portailService.lire() puis rend le composant.
 *
 * Les services avec avecLayout:true (ex: Scolarité) fournissent leur propre
 * layout complet - cette page est donc rendue sans PortailLayout dans App.jsx.
 *
 * Les autres services restent dans PortailLayout (sidebar globale).
 */
export default function ServiceEtablissementPage() {
  const { code } = useParams()
  const slug     = useSlugEtablissement()
  const navigate = useNavigate()
  const notify   = useNotify()
  const [etat, setEtat] = useState({ chargement: true })
  usePageTitle(etat.service?.nom)

  useEffect(() => {
    let annule = false
    const retour = () => navigate(lienEtablissement(slug, '/portail'), { replace: true })

    portailService.lire()
      .then((r) => {
        if (annule) return
        const s = r?.services?.find((x) => x.code === code)
        if (!s || !s.accessible) {
          notify.warning('Accès refusé', "Vous n'avez pas accès à ce service.")
          retour()
          return
        }
        setEtat({ chargement: false, service: s, etablissement: r.etablissement })
      })
      .catch((err) => {
        if (annule) return
        notify.fromError(err)
        retour()
      })
    return () => { annule = true }
  }, [code, slug, navigate, notify])

  const Icone = iconePourCode(code)

  if (etat.chargement) {
    return (
      <main className="portail-main">
        <Loader mode="inline" label="Ouverture du service…" />
      </main>
    )
  }

  return <ServiceContenu service={etat.service} Icone={Icone} slug={slug} />
}
