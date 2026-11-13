import { useMemo } from 'react'
import {
  BarChart3, BookOpen, CalendarRange, ClipboardCheck, ClipboardList, GraduationCap, Home, MessageSquareWarning, SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { roleCodeOf } from '../../config/identite/routes'
import PageModule, { Accueil } from '../../components/modules/PageModule'
import PanneauNotes from '../../components/evaluations/PanneauNotes'
import PanneauResultats from '../../components/evaluations/PanneauResultats'
import PanneauPeriodes from '../../components/evaluations/PanneauPeriodes'
import PanneauMatieres from '../../components/evaluations/PanneauMatieres'
import PanneauParametres from '../../components/evaluations/PanneauParametres'
import PanneauContestations from '../../components/evaluations/PanneauContestations'
import PanneauMesBulletins from '../../components/evaluations/PanneauMesBulletins'

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

export default function EvaluationsPage() {
  const { user } = useAuth()
  const role = roleCodeOf(user)
  const sections = useMemo(() => SECTIONS[role] ?? [], [role])

  return (
    <PageModule
      titre="Évaluations"
      icone={ClipboardCheck}
      codesService={['evaluations', 'evaluation']}
      sections={sections}
      filtresUrl={FILTRES}
      accueilVide="Les évaluations sont accessibles aux administrateurs, enseignants, apprenants et parents."
      rendu={(section, { filtres, setFiltres, aller }) => {
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
              <Accueil titre="Évaluations" sections={sections} aller={aller}
                texte={role === 'administrateur'
                  ? 'Configurez les périodes, les matières et les règles de calcul, puis suivez les notes et les bulletins de l\'établissement.'
                  : 'Vos évaluations, la saisie des notes et les résultats de vos classes.'} />
            )
        }
      }}
    />
  )
}
