import { useMemo } from 'react'
import { BarChart3, HandCoins, Receipt, Settings2, ShieldCheck, Tags, Wallet } from 'lucide-react'
import { financesService } from '../../services/finances/finances.service'
import PageModule from '../../components/modules/PageModule'
import GrilleDroits from '../../components/modules/GrilleDroits'
import { useDonnees } from '../../components/modules/outils'
import PanneauMesPaiements from '../../components/finances/PanneauMesPaiements'
import PanneauFactures from '../../components/finances/PanneauFactures'
import PanneauReglements from '../../components/finances/PanneauReglements'
import PanneauFormules from '../../components/finances/PanneauFormules'
import PanneauTableau from '../../components/finances/PanneauTableau'
import PanneauParametres from '../../components/finances/PanneauParametres'

/**
 * Module Finances : famille (apprenant, parent) d'un côté, gestion selon la grille de l'établissement de l'autre.
 * L'argent réel est encaissé par le microservice Paiement ; Finances suit ce qui est dû et ce qui est réglé.
 */
export default function FinancesPage() {
  const droits = useDonnees(() => financesService.mesDroits(), [])
  const d = droits.donnees
  const actions = useMemo(() => d?.actions ?? [], [d])

  const sections = useMemo(() => {
    if (!d) return []
    const a = (x) => actions.includes(x)
    return [
      a('consulter_rapports') && { code: 'tableau', label: 'Tableau de bord', Icon: BarChart3, groupe: 'FINANCES' },
      d.famille && { code: 'mes-paiements', label: 'Scolarité et paiements', Icon: Wallet, groupe: 'FINANCES' },
      a('consulter_finances') && { code: 'factures', label: 'Factures', Icon: Receipt, groupe: 'FINANCES' },
      (a('consulter_finances') || a('valider_reglement')) && { code: 'reglements', label: 'Règlements', Icon: HandCoins, groupe: 'FINANCES' },
      (a('gerer_tarifs') || a('emettre_factures')) && { code: 'formules', label: 'Formules tarifaires', Icon: Tags, groupe: 'CONFIGURATION' },
      d.administrateur && { code: 'parametres', label: 'Paramètres', Icon: Settings2, groupe: 'CONFIGURATION' },
      d.administrateur && { code: 'droits', label: 'Droits par rôle', Icon: ShieldCheck, groupe: 'CONFIGURATION' },
    ].filter(Boolean)
  }, [d, actions])

  return (
    <PageModule
      titre="Finances"
      icone={Wallet}
      codesService={['finances', 'finance']}
      sections={sections}
      filtresUrl={['facture']}
      chargement={droits.chargement}
      accueilVide="Aucune fonction financière n'est ouverte à votre profil : l'administrateur peut vous en attribuer."
      rendu={(section, { filtres, setFiltres, aller }) => {
        switch (section.code) {
          case 'mes-paiements': return <PanneauMesPaiements role={d.role} filtres={filtres} setFiltres={setFiltres} />
          case 'factures': return <PanneauFactures actions={actions} devise={d.devise} filtres={filtres} setFiltres={setFiltres} />
          case 'reglements': return <PanneauReglements actions={actions} devise={d.devise} setFiltres={setFiltres} />
          case 'formules': return <PanneauFormules actions={actions} devise={d.devise} />
          case 'parametres': return <PanneauParametres />
          case 'droits': return <GrilleDroits module="Finances" charger={financesService.grille} enregistrer={financesService.definirDroits} />
          default: return <PanneauTableau onAller={aller} />
        }
      }}
    />
  )
}
