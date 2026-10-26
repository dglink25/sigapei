import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import './index.css'
import App from './App.jsx'
import { Toasts } from './components/Toasts.jsx'

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
    <QueryClientProvider client={clientRequetes}>
      <BrowserRouter>
        <App />
        <Toasts />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
