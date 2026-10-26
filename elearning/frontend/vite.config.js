import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Le backend Django ne sert aucun en-tête CORS : en développement, les
// appels /v1/ passent par le proxy Vite. La cible est configurable :
// - local : http://127.0.0.1:8000 (défaut - IPv4 explicite : Node résout
//   « localhost » en ::1 sous Windows et la connexion est refusée) ;
// - Docker : BACKEND_PROXY=http://backend:8000 (voir docker-compose.yml)
const cibleBackend = process.env.BACKEND_PROXY || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1': {
        target: cibleBackend,
        changeOrigin: true,
      },
    },
  },
})
