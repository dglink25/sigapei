# ============================================================
# Étape 1 : Build de production avec Node 22 Alpine
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Installer les dépendances en premier (couche cachée par Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copier les sources et construire le bundle de production Vite
COPY . .
RUN npm run build

# ============================================================
# Étape 2 : Serveur web statique ultra-léger (Nginx Alpine)
# ============================================================
FROM nginx:stable-alpine AS production

# Supprimer la config Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier notre configuration Nginx optimisée (SPA React, compression, headers sécurité)
COPY docker/nginx.conf /etc/nginx/conf.d/sigapei-frontend.conf

# Copier les fichiers buildés depuis l'étape builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier le logo et les assets publics
COPY --from=builder /app/public /usr/share/nginx/html

EXPOSE 3000

# Démarrer Nginx en mode foreground (requis pour Docker)
CMD ["nginx", "-g", "daemon off;"]
