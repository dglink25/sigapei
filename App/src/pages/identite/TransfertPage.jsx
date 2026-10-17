import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/identite/AuthContext'
import { detecterSlugEtablissement, urlConnexion } from '../../lib/etablissements/subdomain'
import { transfertService } from '../../services/identite/transfert.service'
import { ErrorPage } from '../commun/ErrorPages'
import Loader from '../../components/commun/Loader'

/** /auth/callback d'un établissement : échange le code à usage unique contre la session (transfert depuis la connexion centrale). */
export default function TransfertPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [erreur, setErreur] = useState(null)
  const lance = useRef(false)

  useEffect(() => {
    if (lance.current) return
    lance.current = true
    const code = params.get('code')
    const to = params.get('to') ?? '/portail'
    const cible = to.startsWith('/') && !to.startsWith('//') ? to : '/portail'
    const executer = async () => {
      if (!code) {
        setErreur('Le lien de connexion est incomplet.')
        return
      }
      try {
        await login(await transfertService.echanger(code))
        navigate(cible, { replace: true })
      } catch {
        setErreur('Ce lien de connexion a expiré ou a déjà été utilisé.')
      }
    }
    executer()
  }, [params, login, navigate])

  if (!erreur) return <Loader label="Connexion à votre établissement…" />
  return (
    <ErrorPage
      code="401"
      title="Connexion impossible"
      message={erreur}
      actions={[{ label: 'Se reconnecter', href: urlConnexion(detecterSlugEtablissement()), primary: true }]}
    />
  )
}
