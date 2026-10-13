// API publique du module d'authentification.
// Usage : import { RequireAuth, useAuth } from '../pages/identite'
export { default as AuthPage } from './AuthPage'
export { default as SecuritePage } from './SecuritePage'
export { AuthProvider, useAuth } from './AuthContext'
export { default as RequireAuth, withAuth, roleOf } from './RequireAuth'
export { default as PublicOnly } from './PublicOnly'
export { authService } from './services/auth.service'
export { LOGIN_PATH, HOME_PATH, SECURITY_PATH, FORBIDDEN_PATH } from './config'
