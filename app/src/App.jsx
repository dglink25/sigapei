import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ENV } from './config/env'
import { ProtectedRoute, PublicOnlyRoute } from './components/routes'
import AuthPage from './pages/identite/AuthPage'
import Home from './pages/Home'
import { ForbiddenPage, NotFoundPage } from './pages/errors/ErrorPages'

export default function App() {
  useEffect(() => { document.title = ENV.appName }, [])

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        {/* Ajoutez ici les autres pages protegees ; <ProtectedRoute roles={['administrateur']} /> pour restreindre par role */}
      </Route>

      <Route path="/acces-refuse" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
