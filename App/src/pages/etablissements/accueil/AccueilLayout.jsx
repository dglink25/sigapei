/**
 * AccueilLayout - Layout commun des pages publiques d'un établissement.
 * Header + <Outlet> + Footer. Les données et cycles actifs sont chargés ici
 * une seule fois et partagés via Context aux pages enfants.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { accueilPublicService } from '../../../services/etablissements/accueilPublic.service'
import { cyclesPublicsService } from '../../../services/etablissements/cyclesPublics.service'
import { appelsPublicsService } from '../../../services/inscription/appelsPublics.service'
import { detecterSlugEtablissement, urlPlateforme, lienEtablissement } from '../../../lib/etablissements/subdomain'
import { tokenStore } from '../../../lib/identite/tokenStore'
import AccueilHeader from '../../../components/etablissements/AccueilHeader'
import AccueilFooter from '../../../components/etablissements/AccueilFooter'
import { ENV } from '../../../config/commun/env'
import Loader from '../../../components/commun/Loader'
import usePageTitle from '../../../hooks/commun/usePageTitle'
import '../AccueilEtablissement.css'
import '../../commun/ErrorPages.css'

const CYCLE_LABELS = {
  maternelle:    'Maternelle',
  primaire:      'Primaire',
  secondaire:    'Secondaire',
  universitaire: 'Université',
}

/* ── Contexte partagé avec les pages enfants ── */
export const AccueilCtx = createContext(null)
export function useAccueil() { return useContext(AccueilCtx) }

export default function AccueilLayout() {
  const { slug: slugParam } = useParams()
  const slug     = slugParam ?? detecterSlugEtablissement()
  const navigate = useNavigate()
  const location = useLocation()

  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [erreur,       setErreur]       = useState(null)
  const [connecte,     setConnecte]     = useState(false)
  const [cyclesActifs, setCyclesActifs] = useState([]) // ex: ['secondaire', 'primaire']

  useEffect(() => { setConnecte(!!tokenStore.getAccess()) }, [])

  useEffect(() => {
    if (!slug) return
    let annule = false
    setLoading(true)
    Promise.allSettled([
      accueilPublicService.lire(slug),
      cyclesPublicsService.listerAutorises(slug),
      appelsPublicsService.listerTous(null, slug),
    ])
      .then(([resultData, resultCycles, resultAppels]) => {
        if (annule) return
        if (resultData.status === 'fulfilled') {
          setData(resultData.value)
        } else {
          setErreur('Établissement introuvable ou indisponible.')
          return
        }
        const tousLesCycles = resultCycles.status === 'fulfilled'
          ? (Array.isArray(resultCycles.value) ? resultCycles.value : [])
          : []
        const appels = resultAppels.status === 'fulfilled'
          ? (Array.isArray(resultAppels.value) ? resultAppels.value : [])
          : []
        // Cycles qui ont au moins un appel ouvert ou planifié
        const cyclesAvecAppels = new Set(
          appels
            .filter((a) => ['ouvert', 'planifie', 'brouillon'].includes(a.statut))
            .map((a) => a.cycle)
        )
        const actifs = tousLesCycles.filter((c) => cyclesAvecAppels.has(c))
        setCyclesActifs(actifs.length > 0 ? actifs : tousLesCycles)
      })
      .finally(() => { if (!annule) setLoading(false) })
    return () => { annule = true }
  }, [slug])

  usePageTitle(data?.nom ?? null)

  if (loading) return <Loader label="Chargement…" />

  if (erreur || !data) {
    return (
      <div className="err-page">
        <div className="err-card">
          <img src="/sigapei.png" alt={ENV.appName} className="err-logo" />
          <Building2 size={44} style={{ color: '#E9AA20', marginBottom: 8 }} />
          <h1 className="err-title">Établissement introuvable</h1>
          <p className="err-msg">{erreur ?? "Cet établissement n'existe pas ou n'est plus actif."}</p>
          <div className="err-actions">
            <a href={urlPlateforme('/')} className="err-btn is-primary">Retour à SIGAPEI</a>
          </div>
        </div>
      </div>
    )
  }

  if (data.degrade) {
    return (
      <div className="err-page">
        <div className="err-card">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.nom ?? ''} className="err-logo" />
            : <img src="/sigapei.png" alt={ENV.appName} className="err-logo" />
          }
          <Building2 size={44} style={{ color: '#c97e00', marginBottom: 8 }} />
          <h1 className="err-title">{data.nom ?? 'Établissement'}</h1>
          <p className="err-msg">{data.message ?? "Cet établissement n'est pas accessible pour le moment."}</p>
          <div className="err-actions">
            <a href={urlPlateforme('/')} className="err-btn">Retour à SIGAPEI</a>
          </div>
        </div>
      </div>
    )
  }

  const lienEspace = lienEtablissement(slug, '/portail')
  const actualites = Array.isArray(data.actualites) ? data.actualites : []
  const galerie    = Array.isArray(data.galerie)    ? data.galerie    : []

  const base = slug ? `/etablissements/${slug}` : ''

  /* Navigation principale */
  const NAV = [
    /* Accueil avec sous-menu pages */
    {
      id: 'accueil',
      label: 'Accueil',
      href: base || '/',
      sousMenu: [
        { id: 'presentation', label: 'Présentation', href: base || '/' },
        ...(actualites.length ? [{ id: 'actualites', label: 'Actualités', href: `${base}/actualites` }] : []),
        ...(galerie.length    ? [{ id: 'galerie',    label: 'Galerie',    href: `${base}/galerie`    }] : []),
        { id: 'contact', label: 'Contact', href: `${base}/contact` },
      ],
    },
    /* Formations avec sous-menu cycles */
    {
      id: 'formations',
      label: 'Formations',
      href: `${base}/formations`,
      sousMenu: cyclesActifs.length > 0
        ? [
            { id: 'formations-all', label: 'Toutes les formations', href: `${base}/formations` },
            ...cyclesActifs.map((cycle) => ({
              id: `cycle-${cycle}`,
              label: CYCLE_LABELS[cycle] ?? cycle,
              href: `${base}/formations/${cycle}`,
            })),
          ]
        : [],
    },
  ]

  function naviguerVers(item) {
    navigate(item.href)
  }

  return (
    <AccueilCtx.Provider value={{ data, slug, connecte, lienEspace, NAV, cyclesActifs }}>      <div className="ae2-page">
        <AccueilHeader
          data={data}
          slug={slug}
          connecte={connecte}
          lienEspace={lienEspace}
          navItems={NAV}
          onScrollTo={naviguerVers}
          currentPath={location.pathname}
        />

        <main>
          <Outlet />
        </main>

        <AccueilFooter
          data={data}
          navItems={NAV}
          onScrollTo={naviguerVers}
        />
      </div>
    </AccueilCtx.Provider>
  )
}
