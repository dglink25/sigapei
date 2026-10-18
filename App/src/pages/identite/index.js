// API publique du module authentification.
// Tous les imports sont redirigés vers les emplacements canoniques.
export { default as AuthPage } from './AuthPage'
export { default as RequireAuth, withAuth, roleOf } from '../../components/identite/RequireAuth'
export { default as PublicOnly } from '../../components/identite/PublicOnly'
