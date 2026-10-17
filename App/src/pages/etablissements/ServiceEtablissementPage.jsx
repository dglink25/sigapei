import { Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { iconePourCode } from '../../config/services/config'
import { COMPOSANTS_SERVICES } from '../../config/services/registre'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import EtablissementHeader from '../../components/etablissements/EtablissementHeader'
import Loader from '../../components/commun/Loader'
import '../commun/Portail.css'

/** https://<slug>.sigapei.com/<code-du-service>/... : vérifie l'accès, puis affiche le service ou « Bientôt disponible ». */
export default function ServiceEtablissementPage() {
  const { code } = useParams()
  const slug = useSlugEtablissement()
  const navigate = useNavigate()
  const notify = useNotify()
  const [etat, setEtat] = useState({ chargement: true })
  usePageTitle(etat.service?.nom)

  useEffect(() => {
    let annule = false
    const retour = () => navigate(lienEtablissement(slug, '/portail'), { replace: true })
    portailService
      .lire()
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

  const Composant = COMPOSANTS_SERVICES[code]
  const Icone = iconePourCode(code)

  return (
    <div className="portail-shell">
      <EtablissementHeader slug={slug} etablissementNom={etat.etablissement?.nom} />
      <main className="portail-main">
        {etat.chargement ? (
          <Loader mode="inline" label="Ouverture du service…" />
        ) : Composant ? (
          <Suspense fallback={<Loader mode="inline" label="Chargement du service…" />}><Composant service={etat.service} /></Suspense>
        ) : (
          <div className="portail-etat" role="status">
            <Icone size={40} aria-hidden="true" />
            <h2>{etat.service.nom}</h2>
            <p>{etat.service.description || 'Ce service'} sera disponible très prochainement. Vous y avez déjà accès : il s'ouvrira ici dès son activation.</p>
            <span className="portail-card-soon"><Construction size={12} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> Bientôt disponible</span>
            <Link to={lienEtablissement(slug, '/portail')} className="portail-card-btn"><ArrowLeft size={14} aria-hidden="true" /> Retour au portail</Link>
          </div>
        )}
      </main>
    </div>
  )
}
