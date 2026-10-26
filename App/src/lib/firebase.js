import { ENV } from '../config/env'
import { ApiError } from './http'

let authPromise = null

async function getFirebaseAuth() {
  const c = ENV.firebase
  if (!c.apiKey || !c.projectId) {
    throw new ApiError({
      kind: 'config',
      title: 'Connexion indisponible',
      message: "La connexion Google / GitHub n'est pas encore configurée sur cette plateforme.",
    })
  }
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps }, { getAuth }] = await Promise.all([
        import('@firebase/app'),
        import('@firebase/auth'),
      ])
      const auth = getAuth(getApps()[0] ?? initializeApp(c))
      auth.languageCode = 'fr'
      return auth
    })()
  }
  return authPromise
}

/** Ouvre la fenetre Google/GitHub et renvoie l'idToken Firebase a transmettre au microservice. */
export async function getProviderIdToken(name) {
  const auth = await getFirebaseAuth()
  const { signInWithPopup, signOut, GoogleAuthProvider } = await import('@firebase/auth')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth, provider)
  const idToken = await cred.user.getIdToken()
  await signOut(auth).catch(() => {}) // la session applicative est portee par nos propres jetons
  return idToken
}
