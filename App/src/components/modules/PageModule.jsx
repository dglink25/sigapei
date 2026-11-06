import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import ModuleLayout from '../commun/ModuleLayout'
import Loader from '../commun/Loader'
import { EtatVide } from './outils'

import '../../pages/AdministrationPrincipale/admin.css'
import '../administration/admin-ui.css'
import '../../pages/etablissements/ConfigurationPage.css'
import './modules.css'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Coquille commune des modules métier : accès vérifié dans le portail (catalogue d'Identité),
 * navigation par sections (?section=), filtres uuid conservés dans l'adresse (actualisation, retour, partage).
 *  - sections : [{ code, label, Icon, groupe, texte? }] déjà filtrées selon les droits du profil ;
 *  - rendu(section, { filtres, setFiltres, aller }) : contenu de la section.
 */
export default function PageModule({ titre, icone, codesService, sections, filtresUrl = [], chargement = false, rendu, accueilVide }) {
  usePageTitle(titre)
  const slug = useSlugEtablissement()
  const [params, setParams] = useSearchParams()
  const [acces, setAcces] = useState('chargement')

  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => {
        if (annule) return
        const s = r?.services?.find((x) => codesService.includes(x.code))
        setAcces(s?.accessible ? 'autorise' : 'refuse')
      })
      .catch(() => { if (!annule) setAcces('refuse') })
    return () => { annule = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const section = sections.find((s) => s.code === params.get('section')) ?? sections[0] ?? null
  const base = lienEtablissement(slug, `/${codesService[0]}`)

  const filtres = useMemo(
    () => Object.fromEntries(filtresUrl.map((k) => [k, UUID.test(params.get(k) ?? '') ? params.get(k).toLowerCase() : ''])),
    [params, filtresUrl],
  )
  const setFiltres = useCallback((changements) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(changements).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
      return next
    }, { replace: true })
  }, [setParams])
  const aller = useCallback((code, extra = {}) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    next.set('section', code)
    Object.entries(extra).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    return next
  }), [setParams])

  const nav = useMemo(() => {
    const groupes = []
    sections.forEach((s) => {
      let g = groupes.find((x) => x.groupe === s.groupe)
      if (!g) groupes.push(g = { groupe: s.groupe, items: [] })
      const p = new URLSearchParams()
      p.set('section', s.code)
      filtresUrl.forEach((k) => filtres[k] && p.set(k, filtres[k]))
      g.items.push({ href: `${base}?${p.toString()}`, label: s.label, Icon: s.Icon, actif: section?.code === s.code })
    })
    return groupes
  }, [sections, section, base, filtres, filtresUrl])

  if (acces === 'refuse') return <Navigate to={lienEtablissement(slug, '/portail')} replace />
  if (acces === 'chargement' || chargement) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Loader mode="inline" label="Ouverture du module…" />
      </div>
    )
  }

  return (
    <ModuleLayout titre={titre} icone={icone} nav={nav}>
      <div className="ap ev-page">
        {section ? rendu(section, { filtres, setFiltres, aller }) : (
          <EtatVide icone={icone} titre="Rien à afficher pour votre profil" texte={accueilVide} />
        )}
      </div>
    </ModuleLayout>
  )
}

/** Tuiles d'accueil : une par section qui a un texte. */
export function Accueil({ titre, texte, sections, aller, children }) {
  return (
    <section className="ev" aria-labelledby="ev-titre-accueil">
      <div>
        <h2 className="ap-page-title" id="ev-titre-accueil">{titre}</h2>
        {texte && <p className="ap-page-sub">{texte}</p>}
      </div>
      {children}
      <div className="ev-tuiles">
        {sections.filter((s) => s.texte).map((s) => (
          <button key={s.code} type="button" className="ev-tuile" onClick={() => aller(s.code)}>
            <s.Icon size={22} aria-hidden="true" />
            <strong>{s.label}</strong>
            <span>{s.texte}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
