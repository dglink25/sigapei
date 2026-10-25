/**
 * ConfigurationPage - Configuration académique.
 * ?section=annees|droits|etablissement|demandes-cycle
 * ?cycle=primaire&onglet=groupes
 */
import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronRight, School, BookOpen, GraduationCap, Building2, Plus } from 'lucide-react'

import { lienEtablissement }   from '../../lib/etablissements/subdomain'
import { portailService }      from '../../services/identite/portail.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import useSlugEtablissement    from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle            from '../../hooks/commun/usePageTitle'

import AccesDroitsPanel        from '../../components/etablissements/AccesDroitsPanel'
import InfosEtablissementPanel from '../../components/etablissements/InfosEtablissementPanel'
import PanneauAnnees           from '../../components/etablissements/config/PanneauAnnees'
import PanneauCyclePage        from '../../components/etablissements/config/PanneauCyclePage'
import PanneauDemandesCycle    from '../../components/etablissements/config/PanneauDemandesCycle'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import './ConfigurationPage.css'

export const CYCLE_LABELS  = { maternelle:'Maternelle', primaire:'Primaire', secondaire:'Secondaire', universitaire:'Université' }
const CYCLE_ICONES          = { maternelle:School, primaire:BookOpen, secondaire:GraduationCap, universitaire:Building2 }
const LIBELLES_STATUT       = { en_cours:'En cours', a_venir:'À venir', termine:'Terminée', suspendu:'Suspendue' }
const SECTION_LABELS        = { annees:'Années académiques', droits:"Droits d'accès", etablissement:'Infos établissement', 'demandes-cycle':'Demande de cycle' }

export default function ConfigurationPage() {
  usePageTitle('Configuration')
  const slug = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()
  const section    = searchParams.get('section') ?? ''
  const cycleParam = searchParams.get('cycle')   ?? ''

  const [etab,        setEtab]        = useState(null)
  const [anneeActive, setAnneeActive] = useState(null)
  const [cyclesActifs,setCyclesActifs]= useState([])
  const [progres,     setProgres]     = useState({})

  useEffect(()=>{
    let c=false
    portailService.lire().then((r)=>{ if(!c) setEtab(r?.etablissement??null) }).catch(()=>{})
    return ()=>{ c=true }
  },[])

  useEffect(()=>{
    let c=false
    anneesService.lister().then((r)=>{
      if(c) return
      const liste=r?.data??r??[]
      const active=liste.find((a)=>a.statut==='en_cours')??liste[0]??null
      setAnneeActive(active)
      if(liste.length>0) setProgres((p)=>({...p,annees:true}))
    }).catch(()=>{})
    return ()=>{ c=true }
  },[])

  useEffect(()=>{
    if(!anneeActive) return
    let c=false
    cyclesService.lister(anneeActive.uuid).then((r)=>{
      if(c) return
      const liste=(r?.data??r??[]).filter((x)=>x.actif)
      setCyclesActifs(liste)
      if(liste.length>0) setProgres((p)=>({...p,cycles:true}))
    }).catch(()=>{})
    return ()=>{ c=true }
  },[anneeActive?.uuid])

  const allerA = useCallback((params)=>setSearchParams(params),[setSearchParams])
  const marquer = useCallback((id)=>setProgres((p)=>({...p,[id]:true})),[])
  const configBase = lienEtablissement(slug, '/configuration')

  function renduContenu() {
    if (section==='annees')         return <PanneauAnnees anneeActive={anneeActive} setAnneeActive={setAnneeActive} onTerminee={marquer}/>
    if (section==='droits')         return <AccesDroitsPanel/>
    if (section==='etablissement')  return <InfosEtablissementPanel/>
    if (section==='demandes-cycle') return <PanneauDemandesCycle/>
    if (cycleParam) return (
      <PanneauCyclePage
        cycle={cycleParam}
        cycleObj={cyclesActifs.find((c)=>c.cycle===cycleParam)}
        anneeActive={anneeActive}
        onTerminee={marquer}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
    )
    return <VueEnsemble etab={etab} anneeActive={anneeActive} cyclesActifs={cyclesActifs} allerA={allerA}/>
  }

  // Fil d'ariane
  const migettes = [
    <Link key="p" to={lienEtablissement(slug,'/portail')}>Portail</Link>,
    <span key="s1" className="ap-bread-sep">/</span>,
    <Link key="c" to={configBase}>Configuration</Link>,
  ]
  if (cycleParam) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="cy">{CYCLE_LABELS[cycleParam]??cycleParam}</span>)
    const o=searchParams.get('onglet')
    if(o){ migettes.push(<span key="s3" className="ap-bread-sep">/</span>); migettes.push(<span key="on">{o}</span>) }
  } else if (section) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="se">{SECTION_LABELS[section]??section}</span>)
  }

  return (
    <div className="ap cfg">
      <nav className="ap-bread" aria-label="Fil d'ariane">{migettes}</nav>
      {anneeActive && (
        <div className="cfg-annee-bandeau">
          <CalendarDays size={14} aria-hidden="true"/>
          <span>Année active :</span>
          <strong>{anneeActive.libelle}</strong>
          <span className={`cfg-statut-badge ${anneeActive.statut}`}>{LIBELLES_STATUT[anneeActive.statut]??anneeActive.statut}</span>
        </div>
      )}
      {renduContenu()}
    </div>
  )
}

/* ── Vue d'ensemble - cycles en premier, accès direct ── */
function VueEnsemble({ etab, anneeActive, cyclesActifs, allerA }) {
  return (
    <>
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Configuration{etab ? ` · ${etab.nom}` : ''}</h2>
          <p className="ap-page-sub">
            {anneeActive
              ? `Année ${anneeActive.libelle} - Sélectionnez un cycle pour le configurer.`
              : 'Créez d\'abord une année académique.'}
          </p>
        </div>
      </div>

      {/* Cycles actifs - raccourcis directs, premier plan */}
      {cyclesActifs.length > 0 && (
        <>
          <h3 style={{margin:'0 0 12px',fontSize:'0.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--sg-text-muted)'}}>
            Cycles actifs
          </h3>
          <div className="cfg-cycles-grille" style={{marginBottom:32}}>
            {cyclesActifs.map((c)=>{
              const Icon = CYCLE_ICONES[c.cycle] ?? School
              return (
                <button key={c.uuid} type="button" className="cfg-cycle-carte is-actif"
                  onClick={()=>allerA({cycle:c.cycle, onglet:'groupes'})}>
                  <span className="cfg-cycle-icone"><Icon size={22} aria-hidden="true"/></span>
                  <span className="cfg-cycle-nom">{CYCLE_LABELS[c.cycle]}</span>
                  <span className="cfg-cycle-etat">Configurer</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Invite si pas de cycles */}
      {cyclesActifs.length===0 && anneeActive && (
        <div className="ap-alert ap-alert--warning" style={{marginBottom:24}}>
          <span>Aucun cycle actif pour <strong>{anneeActive.libelle}</strong>.{' '}
            <button type="button" style={{border:0,background:'none',color:'inherit',fontWeight:700,cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}
              onClick={()=>allerA({section:'annees'})}>Activer des cycles</button>
          </span>
        </div>
      )}
      {!anneeActive && (
        <div className="ap-alert ap-alert--warning" style={{marginBottom:24}}>
          <span>
            <button type="button" style={{border:0,background:'none',color:'inherit',fontWeight:700,cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}
              onClick={()=>allerA({section:'annees'})}>Créer une année académique</button>
            {' '}pour commencer.
          </span>
        </div>
      )}

      {/* Autres sections en bas */}
      <h3 style={{margin:'0 0 12px',fontSize:'0.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--sg-text-muted)'}}>
        Autres paramètres
      </h3>
      <div className="cfg-etapes">
        {[
          {label:'Années académiques', sous:'Gérer les années, les cycles autorisés',  section:'annees'},
          {label:"Droits d'accès",     sous:'Gérer les accès des utilisateurs',         section:'droits'},
          {label:'Infos établissement',sous:'Logo, types, adresse, localisation',        section:'etablissement'},
          {label:'Demande de cycle',   sous:'Demander un nouveau cycle au Super Admin',  section:'demandes-cycle'},
        ].map(({label,sous,section})=>(
          <button key={section} type="button" className="cfg-etape" onClick={()=>allerA({section})}>
            <span>
              <span className="cfg-etape-texte">{label}</span>
              <span style={{display:'block',fontSize:'0.78rem',color:'var(--sg-text-muted)',marginTop:2}}>{sous}</span>
            </span>
            <ChevronRight size={16} style={{marginLeft:'auto',flexShrink:0,color:'var(--sg-text-muted)'}} aria-hidden="true"/>
          </button>
        ))}
      </div>
    </>
  )
}
