import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Le backend Laravel ne sert aucun en-tete CORS : en developpement, les appels
// /v1/ passent par le proxy Vite. La cible est configurable :
// - local : http://127.0.0.1:4005 (defaut - IPv4 explicite : Node resout
//   « localhost » en ::1 sous Windows et la connexion est refusee) ;
// - Docker : BACKEND_PROXY=http://nginx (service nginx du microservice, sur
//   le reseau Docker externe `sigapei`).
const cibleBackend = process.env.BACKEND_PROXY || 'http://127.0.0.1:4005'

// Regle n°3 : les endpoints /v1/interne/* ne doivent JAMAIS etre appeles par un
// client final. Le secret X-Internal-Secret est donc injecte cote serveur par le
// proxy Vite (variable d'environnement INTERNAL_API_SECRET, definie dans le
// shell ou un fichier .env.local) : il ne part jamais dans le bundle navigateur.
const secretInterne = process.env.INTERNAL_API_SECRET || ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Doit etre declare AVANT '/v1' : le premier prefixe correspondant gagne.
      '/v1/interne': {
        target: cibleBackend,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (secretInterne) {
              proxyReq.setHeader('X-Internal-Secret', secretInterne)
            }
          })
        },
      },
      '/v1': {
        target: cibleBackend,
        changeOrigin: true,
      },
    },
  },
})
