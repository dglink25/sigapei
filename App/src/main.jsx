import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './theme.css'
import App from './App'
import ErrorBoundary from './components/commun/ErrorBoundary'
import { NotifyProvider } from './context/commun/NotifyContext'
import { ThemeProvider } from './context/commun/ThemeContext'
import { AuthProvider } from './context/identite'

// Client React Query (module E-Learning) : pas de retry automatique,
// 15 s de fraîcheur, pas de refetch au focus de la fenêtre.
const clientRequetes = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <NotifyProvider>
            <AuthProvider>
              <QueryClientProvider client={clientRequetes}>
                <App />
              </QueryClientProvider>
            </AuthProvider>
          </NotifyProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
