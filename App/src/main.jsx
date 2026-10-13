import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/commun/ErrorBoundary'
import { NotifyProvider } from './context/commun/NotifyContext'
import { AuthProvider } from './context/identite'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NotifyProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NotifyProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
