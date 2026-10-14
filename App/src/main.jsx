import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './theme.css'
import App from './App'
import ErrorBoundary from './components/commun/ErrorBoundary'
import { NotifyProvider } from './context/commun/NotifyContext'
import { ThemeProvider } from './context/commun/ThemeContext'
import { AuthProvider } from './context/identite'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <NotifyProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </NotifyProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
