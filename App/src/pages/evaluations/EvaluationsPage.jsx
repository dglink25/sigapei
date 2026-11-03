import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarRange, ClipboardCheck, ClipboardList, GraduationCap, Home, MessageSquareWarning, SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { roleCodeOf } from '../../config/identite/routes'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import ModuleLayout from '../../components/commun/ModuleLayout'
import Loader from '../../components/commun/Loader'
import { EtatVide } from '../../components/evaluations/communs'
import PanneauNotes from '../../components/evaluations/PanneauNotes'
import PanneauResultats from '../../components/evaluations/PanneauResultats'
import PanneauPeriodes from '../../components/evaluations/PanneauPeriodes'
import PanneauMatieres from '../../components/evaluations/PanneauMatieres'
import PanneauParametres from '../../components/evaluations/PanneauParametres'
import PanneauContestations from '../../components/evaluations/PanneauContestations'
import PanneauMesBulletins from '../../components/evaluations/PanneauMesBulletins'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import '../etablissements/ConfigurationPage.css'
import './evaluations.css'

const CODES_SERVICE = ['evaluations', 'evaluation']

/** Sections par rôle (le service applique les mêmes droits : l'interface n'affiche que ce qui est permis). */
const SECTIONS = {
  administrateur: [
    { code: 'accueil', label: 'Vue d\'ensemble', Icon: Home, groupe: 'ÉVALUATIONS' },
    { code: 'notes', label: 'Notes des classes', Icon: ClipboardList, groupe: 'ÉVALUATIONS', texte: 'Consulter les notes et corriger une note avec un motif.' },
    { code: 'resultats', label: 'Résultats et bulletins', Icon: BarChart3, groupe: 'ÉVALUATIONS', texte: 'Classements, moyennes par matière et bulletins.' },
    { code: 'contestations', label: 'Contestations', Icon: MessageSquareWarning, groupe: 'ÉVALUATIONS', texte: 'Demandes de vérification de note, y compris celles restées sans réponse.' },
    { code: 'periodes', label: 'Périodes', Icon: CalendarRange, groupe: 'CONFIGURATION', texte: 'Trimestres et semestres ; clôture et archivage des bulletins.' },
    { code: 'matieres', label: 'Matières et coefficients', Icon: BookOpen, groupe: 'CONFIGURATION', texte: 'Référentiel des matières, coefficient par niveau.' },
    { code: 'parametres', label: 'Règles et bulletins', Icon: SlidersHorizontal, groupe: 'CONFIGURATION', texte: 'Barème, calcul des moyennes, mentions et mise en page des bulletins.' },
  ],
  enseignant: [
    { code: 'accueil', label: 'Vue d\'ensemble', Icon: Home, groupe: 'ÉVALUATIONS' },
    { code: 'notes', label: 'Saisie des notes', Icon: ClipboardList, groupe: 'ÉVALUATIONS', texte: 'Créer vos évaluations et saisir les notes de vos classes.' },
    { code: 'resultats', label: 'Résultats des classes', Icon: BarChart3, groupe: 'ÉVALUATIONS', texte: 'Moyennes et bulletins des classes qui vous sont affectées.' },
    { code: 'contestations', label: 'Contestations', Icon: MessageSquareWarning, groupe: 'ÉVALUATIONS', texte: 'Répondre aux demandes de vérification de vos notes.' },
  ],
  apprenant: [
    { code: 'bulletins', label: 'Mes résultats', Icon: GraduationCap, groupe: 'ÉVALUATIONS' },
    { code: 'contestations', label: 'Mes contestations', Icon: MessageSquareWarning, groupe: 'ÉVALUATIONS' },
  ],
  parent: [
    { code: 'bulletins', label: 'Résultats de mes enfants', Icon: GraduationCap, groupe: 'ÉVALUATIONS' },
    { code: 'contestations', label: 'Mes contestations', Icon: MessageSquareWarning, groupe: 'ÉVALUATIONS' },
  ],
}

const FILTRES = ['classe', 'periode', 'matiere', 'apprenant']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function EvaluationsPage() {
  usePageTitle('Évaluations')
  const slug = useSlugEtablissement()
  const { user } = useAuth()
  const role = roleCodeOf(user)
  const [params, setParams] = useSearchParams()
  const [acces, setAcces] = useState('chargement')

  useEffect(() => {
    let annule = false
    portailService.lire()
      .then((r) => {
        if (annule) return
        const s = r?.services?.find((x) => CODES_SERVICE.includes(x.code))
        setAcces(s?.accessible ? 'autorise' : 'refuse')
      })
      .catch(() => { if (!annule) setAcces('refuse') })
    return () => { annule = true }
  }, [])

  const sections = useMemo(() => SECTIONS[role] ?? [], [role])
  const section = sections.find((s) => s.code === params.get('section')) ?? sections[0] ?? null
  const base = lienEtablissement(slug, '/evaluations')

  // Filtres dans l'adresse (actualisation, retour arrière, lien partagé) ; seules des valeurs uuid sont reprises.
  const filtres = useMemo(
    () => Object.fromEntries(FILTRES.map((k) => [k, UUID.test(params.get(k) ?? '') ? params.get(k).toLowerCase() : ''])),
    [params],
  )
  const setFiltres = useCallback((changements) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(changements).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
      return next
    }, { replace: true })
  }, [setParams])

  const nav = useMemo(() => {
    const groupes = []
    sections.forEach((s) => {
      let g = groupes.find((x) => x.groupe === s.groupe)
      if (!g) groupes.push(g = { groupe: s.groupe, items: [] })
      const p = new URLSearchParams()
      p.set('section', s.code)
      FILTRES.forEach((k) => filtres[k] && p.set(k, filtres[k]))
      g.items.push({ href: `${base}?${p.toString()}`, label: s.label, Icon: s.Icon, actif: section?.code === s.code })
    })
    return groupes
  }, [sections, section, base, filtres])

  if (acces === 'refuse') return <Navigate to={lienEtablissement(slug, '/portail')} replace />
  if (acces === 'chargement') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Loader mode="inline" label="Vérification de l'accès…" />
      </div>
    )
  }

  const aller = (code) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    next.set('section', code)
    return next
  })

  const contenu = () => {
    if (!section) {
      return <EtatVide icone={ClipboardCheck} titre="Module non ouvert à votre profil" texte="Les évaluations sont accessibles aux administrateurs, enseignants, apprenants et parents." />
    }
    switch (section.code) {
      case 'notes': return <PanneauNotes role={role} filtres={filtres} setFiltres={setFiltres} />
      case 'resultats': return <PanneauResultats role={role} filtres={filtres} setFiltres={setFiltres} />
      case 'contestations': return <PanneauContestations role={role} />
      case 'periodes': return <PanneauPeriodes />
      case 'matieres': return <PanneauMatieres />
      case 'parametres': return <PanneauParametres />
      case 'bulletins': return <PanneauMesBulletins role={role} filtres={filtres} setFiltres={setFiltres} />
      default:
        return (
          <section className="ev" aria-labelledby="ev-titre-accueil">
            <div>
              <h2 className="ap-page-title" id="ev-titre-accueil">Évaluations</h2>
              <p className="ap-page-sub">
                {role === 'administrateur'
                  ? 'Configurez les périodes, les matières et les règles de calcul, puis suivez les notes et les bulletins de l\'établissement.'
                  : 'Vos évaluations, la saisie des notes et les résultats de vos classes.'}
              </p>
            </div>
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
  }

  return (
    <ModuleLayout titre="Évaluations" icone={ClipboardCheck} nav={nav}>
      <div className="ap ev-page">{contenu()}</div>
    </ModuleLayout>
  )
}
