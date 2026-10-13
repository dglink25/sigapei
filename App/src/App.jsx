import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/env'
import { AuthPage, LOGIN_PATH, PublicOnly, RequireAuth, SECURITY_PATH, SecuritePage, HOME_PATH, FORBIDDEN_PATH } from './pages/identite'
import Home from './pages/Home'
import { ForbiddenPage, NotFoundPage } from './pages/errors/ErrorPages'

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  return (
    <Routes>
      {/* Visiteurs uniquement : un utilisateur connecte est renvoye vers l'application */}
      <Route element={<PublicOnly />}>
        <Route path={LOGIN_PATH} element={<AuthPage />} />
      </Route>

      {/* Toutes les routes ci-dessous exigent une session ; sinon -> /login automatiquement */}
      <Route element={<RequireAuth />}>
        <Route path={HOME_PATH} element={<Home />} />
        <Route path={SECURITY_PATH} element={<SecuritePage />} />

        {/* Restreindre a un role :  <Route element={<RequireAuth roles={['administrateur']} />}> ... </Route> */}
      </Route>

      <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
