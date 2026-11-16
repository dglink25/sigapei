/**
 * AccueilLayout - Layout commun des pages publiques d'un établissement.
 * Header + <Outlet> + Footer. Les données sont chargées ici une seule fois
 * et partagées via Context aux pages enfants.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { accueilPublicService } from '../../../services/etablissements/accueilPublic.service'
import { detecterSlugEtablissement, urlPlateforme, lienEtablissement } from '../../../lib/etablissements/subdomain'
import { tokenStore } from '../../../lib/identite/tokenStore'
import AccueilHeader from '../../../components/etablissements/AccueilHeader'
import AccueilFooter from '../../../components/etablissements/AccueilFooter'
import { ENV } from '../../../config/commun/env'
import Loader from '../../../components/commun/Loader'
import usePageTitle from '../../../hooks/commun/usePageTitle'
import '../AccueilEtablissement.css'

/* ── Contexte partagé avec les pages enfants ── */
export const AccueilCtx = createContext(null)
export function useAccueil() { return useContext(AccueilCtx) }

export default function AccueilLayout() {
  const { slug: slugParam } = useParams()
  const slug     = slugParam ?? detecterSlugEtablissement()
  const navigate = useNavigate()
  const location = useLocation()

  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [erreur,   setErreur]   = useState(null)
  const [connecte, setConnecte] = useState(false)

  useEffect(() => { setConnecte(!!tokenStore.getAccess()) }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    accueilPublicService.lire(slug)
      .then(setData)
      .catch(() => setErreur('Établissement introuvable ou indisponible.'))
      .finally(() => setLoading(false))
  }, [slug])

  usePageTitle(data?.nom ?? null)

  /* ── Chargement ── */
  if (loading) return <Loader label="Chargement…" />

  /* ── Erreur ── */
  if (erreur || !data) {
    return (
      <div className="ae2-error">
        <div className="ae2-error-card">
          <img src="/sigapei.png" alt={ENV.appName} className="ae2-error-logo" />
          <Building2 size={44} className="ae2-error-icon" />
          <h1>Établissement introuvable</h1>
          <p>{erreur ?? "Cet établissement n'existe pas ou n'est plus actif."}</p>
          <a href={urlPlateforme('/')} className="ae2-btn">Retour à SIGAPEI</a>
        </div>
      </div>
    )
  }

  if (data.degrade) {
    return (
      <div className="ae2-error">
        <div className="ae2-error-card">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.nom ?? ''} className="ae2-error-logo" />
            : <img src="/sigapei.png" alt={ENV.appName} className="ae2-error-logo" />
          }
          <Building2 size={44} className="ae2-error-icon ae2-error-icon--warn" />
          <h1>{data.nom ?? 'Établissement'}</h1>
          <p>{data.message ?? "Cet établissement n'est pas accessible pour le moment."}</p>
          <a href={urlPlateforme('/')} className="ae2-btn ae2-btn--ghost">Retour à SIGAPEI</a>
        </div>
      </div>
    )
  }

  const lienEspace   = lienEtablissement(slug, '/portail')
  const formations   = Array.isArray(data.formations)   ? data.formations   : []
  const actualites   = Array.isArray(data.actualites)   ? data.actualites   : []
  const galerie      = Array.isArray(data.galerie)      ? data.galerie      : []

  /* Navigation : pages qui ont du contenu */
  const base = slug ? `/etablissements/${slug}` : ''
  const NAV = [
    { id: 'presentation', label: 'Présentation', href: base || '/' },
    ...(formations.length  ? [{ id: 'formations',  label: 'Formations',  href: `${base}/formations`  }] : []),
    ...(actualites.length  ? [{ id: 'actualites',  label: 'Actualités',  href: `${base}/actualites`  }] : []),
    ...(galerie.length     ? [{ id: 'galerie',     label: 'Galerie',     href: `${base}/galerie`     }] : []),
    { id: 'contact', label: 'Contact', href: `${base}/contact` },
  ]

  /* scrollTo pour ancres internes (page Présentation) */
  function scrollVers(id) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      /* Naviguer d'abord vers la page, puis scroller */
      const item = NAV.find((n) => n.id === id)
      if (item) navigate(item.href)
    }
  }

  /* Naviguer via href pour les liens de nav multi-pages */
  function naviguerVers(item) {
    navigate(item.href)
  }

  return (
    <AccueilCtx.Provider value={{ data, slug, connecte, lienEspace, NAV, scrollVers }}>
      <div className="ae2-page">
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
