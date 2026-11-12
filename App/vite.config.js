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
        // Meme principe pour la surface interne du microservice Vie scolaire
        // (GET /v1/interne/alertes-absences) : secret ajoute cote serveur.
        '/vsc-interne': {
          target: env.VSC_PROXY_TARGET || '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/vsc-interne/, ''),
          headers: env.VSC_INTERNAL_SECRET ? { 'X-Internal-Secret': env.VSC_INTERNAL_SECRET } : {},
        },
        // Module paiements : routes admin super_admin
        '/paiement-api': {
          target: env.PAIEMENT_PROXY_TARGET || 'http://localhost:4010',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/paiement-api/, ''),
        },
      },
    },
  }
})