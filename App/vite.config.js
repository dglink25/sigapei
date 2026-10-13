import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy de développement UNIQUEMENT pour le back-office (routes /interne/*) :
// il ajoute X-Internal-Secret côté serveur Vite, sans l'exposer au navigateur.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const prefix = (env.ETAB_API_PREFIX ?? '').replace(/\/+$/, '') // '' ou '/api'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/etab-interne': {
          target: env.ETAB_PROXY_TARGET || '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/etab-interne/, prefix),
          headers: env.ETAB_INTERNAL_SECRET ? { 'X-Internal-Secret': env.ETAB_INTERNAL_SECRET } : {},
        },
      },
    },
  }
})