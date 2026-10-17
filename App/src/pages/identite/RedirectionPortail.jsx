import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotify } from '../../context/commun/NotifyContext'
import { DASHBOARD_TEMP_PATH } from '../../config/identite/routes'
import { allerVersEtablissement } from '../../lib/identite/transfert'
import { portailService } from '../../services/identite/portail.service'
import Loader from '../../components/commun/Loader'

/**
 * Redirection intelligente après connexion (hors super administrateur) :
 * administrateur ou au moins un service accessible -> portail de son établissement ; sinon tableau de bord temporaire.
 */
export default function RedirectionPortail() {
  const navigate = useNavigate()
  const notify = useNotify()
  const lance = useRef(false)

  useEffect(() => {
    if (lance.current) return
    lance.current = true
    const executer = async () => {
      try {
        const p = await portailService.lire()
        const ouvre = p?.etablissement && (p.estAdmin || p.services?.some((s) => s.accessible))
        if (!ouvre) {
          navigate(DASHBOARD_TEMP_PATH, { replace: true })
          return
        }
        await allerVersEtablissement(p.etablissement.slug, '/portail', navigate)
      } catch (err) {
        notify.fromError(err)
        navigate(DASHBOARD_TEMP_PATH, { replace: true })
      }
    }
    executer()
  }, [navigate, notify])

  return <Loader label="Ouverture de votre espace…" />
}
