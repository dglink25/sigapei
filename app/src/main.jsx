import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { NotifyProvider } from './context/NotifyContext'
import { AuthProvider } from './context/AuthContext'

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
