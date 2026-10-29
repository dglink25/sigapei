import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { useNotify } from '../../context/commun/NotifyContext'
import {
  DASHBOARD_TEMP_PATH,
  determinerEspaceRole,
  cheminEspaceRole,
  roleCodeOf,
} from '../../config/identite/routes'
import { allerVersEtablissement } from '../../lib/identite/transfert'
import { portailService } from '../../services/identite/portail.service'
import Loader from '../../components/commun/Loader'

/**
 * Redirection intelligente après connexion (hors super administrateur) :
 * - Si administrateur ou portail accessible avec au moins un service -> /portail
 * - Si l'accès au portail n'est pas permis :
 *   * apprenant / étudiant / élève -> /apprenant (Dashboard Apprenant)
 *   * parent / tuteur -> /parent (Dashboard Parent)
 *   * prestataire / prestataire externe -> /prestataire (Dashboard Prestataire)
 *   * sinon -> /dashboard temporaire
 */
export default function RedirectionPortail() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotify()
  const lance = useRef(false)

  useEffect(() => {
    if (lance.current) return
    lance.current = true
    const executer = async () => {
      try {
        const p = await portailService.lire()
        const ouvre = p?.etablissement && (p.estAdmin || (p.motif !== 'PORTAIL_INACCESSIBLE' && p.services?.some((s) => s.accessible)))
        if (!ouvre) {
          const roleCode = roleCodeOf(user)
          const espace = determinerEspaceRole(roleCode)
          const cible = espace ? cheminEspaceRole(espace) : DASHBOARD_TEMP_PATH
          if (p?.etablissement?.slug) {
            await allerVersEtablissement(p.etablissement.slug, cible, navigate)
          } else {
            navigate(cible, { replace: true })
          }
          return
        }
        await allerVersEtablissement(p.etablissement.slug, '/portail', navigate)
      } catch (err) {
        notify.fromError(err)
        const roleCode = roleCodeOf(user)
        const espace = determinerEspaceRole(roleCode)
        const cible = espace ? cheminEspaceRole(espace) : DASHBOARD_TEMP_PATH
        navigate(cible, { replace: true })
      }
    }
    executer()
  }, [navigate, notify, user])

  return <Loader label="Ouverture de votre espace…" />
}
