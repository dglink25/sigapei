import { useMemo, useRef } from 'react'
import { BarChart3, CalendarCheck2, CalendarX2, FileCog, FileText, Home, Inbox, MessagesSquare, ShieldCheck, Files } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { roleCodeOf } from '../../config/identite/routes'
import { demandesService } from '../../services/demandes/demandes.service'
import { FAMILLE } from '../../config/demandes/constantes'
import PageModule, { Accueil } from '../../components/modules/PageModule'
import GrilleDroits from '../../components/modules/GrilleDroits'
import { useDonnees } from '../../components/modules/outils'
import PanneauDemandes from '../../components/demandes/PanneauDemandes'
import PanneauReclamations from '../../components/demandes/PanneauReclamations'
import PanneauAbsences from '../../components/demandes/PanneauAbsences'
import PanneauTypes from '../../components/demandes/PanneauTypes'
import PanneauStatistiques from '../../components/demandes/PanneauStatistiques'

/**
 * Module Demandes administratives : chacun demande ses documents et écrit à l'établissement ;
 * les sections de gestion dépendent des actions accordées au rôle (grille de l'établissement).
 */
export default function DemandesPage() {
  const { user } = useAuth()
  const role = roleCodeOf(user)
  const droits = useDonnees(() => demandesService.mesActions(), [])
  const actions = useMemo(() => droits.donnees?.actions ?? [], [droits.donnees])
  const perimetres = useRef({}) // périmètres déjà définis (catégories de réclamations), conservés à l'enregistrement

  const sections = useMemo(() => {
    const a = (x) => actions.includes(x)
    const gestion = actions.length > 0
    return [
      gestion && { code: 'accueil', label: 'Vue d\'ensemble', Icon: Home, groupe: 'MES DÉMARCHES' },
      { code: 'mes-demandes', label: 'Mes demandes de documents', Icon: FileText, groupe: 'MES DÉMARCHES', texte: 'Demander un certificat ou une attestation et suivre son avancement.' },
      FAMILLE.includes(role) && { code: 'absences', label: 'Permissions d\'absence', Icon: CalendarX2, groupe: 'MES DÉMARCHES', texte: 'Prévenir l\'établissement d\'une absence.' },
      { code: 'reclamations', label: 'Mes réclamations', Icon: MessagesSquare, groupe: 'MES DÉMARCHES', texte: 'Écrire à l\'établissement et suivre la réponse.' },
      a('consulter_demandes') && { code: 'file', label: 'Demandes à traiter', Icon: Inbox, groupe: 'GESTION', texte: 'File des demandes : générer, rejeter, accorder une dérogation.' },
      a('valider_permission_absence') && { code: 'absences-validation', label: 'Absences à valider', Icon: CalendarCheck2, groupe: 'GESTION', texte: 'Valider ou rejeter les permissions d\'absence.' },
      a('repondre_reclamation') && { code: 'reclamations-recues', label: 'Réclamations reçues', Icon: Files, groupe: 'GESTION', texte: 'Répondre aux réclamations des usagers.' },
      a('consulter_statistiques') && { code: 'statistiques', label: 'Indicateurs', Icon: BarChart3, groupe: 'GESTION', texte: 'Charge de travail et délais de traitement.' },
      a('configurer_types') && { code: 'types', label: 'Documents délivrés', Icon: FileCog, groupe: 'CONFIGURATION', texte: 'Conditions et modèles des documents.' },
      role === 'administrateur' && { code: 'droits', label: 'Droits par rôle', Icon: ShieldCheck, groupe: 'CONFIGURATION', texte: 'Qui traite quoi dans ce module.' },
    ].filter(Boolean)
  }, [actions, role])

  return (
    <PageModule
      titre="Demandes administratives"
      icone={FileText}
      codesService={['demandes', 'demande', 'demandes-administratives']}
      sections={sections}
      chargement={droits.chargement}
      rendu={(section, { aller }) => {
        switch (section.code) {
          case 'mes-demandes': return <PanneauDemandes mode="mes" role={role} />
          case 'file': return <PanneauDemandes mode="file" role={role} actions={actions} />
          case 'absences': return <PanneauAbsences mode="miennes" />
          case 'absences-validation': return <PanneauAbsences mode="validation" />
          case 'reclamations': return <PanneauReclamations mode="miennes" role={role} />
          case 'reclamations-recues': return <PanneauReclamations mode="recues" role={role} />
          case 'statistiques': return <PanneauStatistiques />
          case 'types': return <PanneauTypes />
          case 'droits':
            return (
              <GrilleDroits module="Demandes administratives"
                charger={async () => { const g = await demandesService.grille(); perimetres.current = g.perimetres; return g }}
                enregistrer={(r, liste) => demandesService.definirDroits(r, liste, perimetres.current[r] ?? {})} />
            )
          default:
            return <Accueil titre="Demandes administratives" texte="Vos démarches et, selon vos droits, le traitement des demandes de l'établissement." sections={sections} aller={aller} />
        }
      }}
    />
  )
}
