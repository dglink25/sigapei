import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const prefix = (env.ETAB_API_PREFIX ?? '').replace(/\/+$/, '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        // E-Learning (Django) - proxy sur chemin dédié pour éviter les conflits
        '/elearning-api': {
          target: env.VITE_ELEARNING_SERVICE_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/elearning-api/, ''),
        },
        // Établissements back-office - ajoute X-Internal-Secret
        '/etab-interne': {
          target: env.ETAB_PROXY_TARGET || '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/etab-interne/, prefix),
          headers: env.ETAB_INTERNAL_SECRET ? { 'X-Internal-Secret': env.ETAB_INTERNAL_SECRET } : {},
        },
        // Vie scolaire - ajoute X-Internal-Secret
        '/vsc-interne': {
          target: env.VSC_PROXY_TARGET || '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/vsc-interne/, ''),
          headers: env.VSC_INTERNAL_SECRET ? { 'X-Internal-Secret': env.VSC_INTERNAL_SECRET } : {},
        },
        // Paiements (super admin)
        '/paiement-api': {
          target: env.PAIEMENT_PROXY_TARGET || '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/paiement-api/, ''),
        },
      },
    },
  }
})
